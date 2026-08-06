"""
RAG 阶段0：教科书 MD → 语义切片

把 organic_chemistry_001/002.md 切成适合 embedding 的 chunk，产出 JSON。

切片策略（三级降级）：
  1. 主边界 = `##` 节（中位数 ~1400 字）
  2. 节内容超 TARGET_UPPER 时，降级到 `###` 小节
  3. 小节仍超长时，按段落累积切到 ~TARGET 字

每块保留章节路径元数据（chapter/section/subsection），供检索后标注来源。

用法：
  python3 backend/scripts/rag_chunk_md.py [--out chunks.json]
"""

import argparse
import hashlib
import json
import re
from pathlib import Path

# 目标块大小（bge-m3 对 512 token 内的文本检索最稳；中文约 700 字 ≈ 512 token）
TARGET = 700
TARGET_UPPER = 1100  # 超过这个字数的节才降级切分
MIN_CHUNK = 30  # 短于该字数的块（交叉引用/空壳标题）无检索价值，丢弃

SRC_FILES = [
    Path(__file__).resolve().parent.parent.parent / "organic_chemistry_001.md",
    Path(__file__).resolve().parent.parent.parent / "organic_chemistry_002.md",
]

HEAD_RE = re.compile(r"^(#{1,4}) (.*)$")


def parse_headings(lines):
    """返回 [(level, index, text), ...]"""
    heads = []
    for i, l in enumerate(lines):
        m = HEAD_RE.match(l)
        if m:
            heads.append((len(m.group(1)), i, m.group(2).strip()))
    return heads


def section_body(lines, heads, idx):
    """第 idx 个标题的直接正文（到下一个同层或更高层标题为止）。"""
    hl, i, _ = heads[idx]
    end = len(lines)
    for hl2, i2, _ in heads[idx + 1 :]:
        if hl2 <= hl:
            end = i2
            break
    return lines[i + 1 : end]


def split_paragraphs(body_lines, target=TARGET, upper=TARGET_UPPER):
    """按段落累积切分（段落间以空行分隔），单块不超过 upper 字。"""
    paras = []
    cur = []
    for l in body_lines:
        if l.strip():
            cur.append(l)
        else:
            if cur:
                paras.append("\n".join(cur))
                cur = []
    if cur:
        paras.append("\n".join(cur))

    chunks = []
    cur_chunk = []
    cur_len = 0
    for p in paras:
        if cur_len > 0 and cur_len + len(p) > upper:
            chunks.append("\n\n".join(cur_chunk))
            cur_chunk, cur_len = [], 0
        cur_chunk.append(p)
        cur_len += len(p)
    if cur_chunk:
        chunks.append("\n\n".join(cur_chunk))
    return chunks


def make_chunk(doc, title, content, chapter, section="", subsection=""):
    h = hashlib.sha256(f"{doc}|{title}|{content[:80]}".encode()).hexdigest()[:16]
    return {
        "id": f"chunk_{h}",
        "source": doc,
        "title": title,
        "content": content,
        "meta": {"chapter": chapter, "section": section, "subsection": subsection},
    }


def build_chunks(src_path: Path) -> list[dict]:
    text = src_path.read_text(encoding="utf-8")
    lines = text.split("\n")
    heads = parse_headings(lines)

    chunks = []
    doc = src_path.name
    dropped = 0

    def add(c: dict):
        nonlocal dropped
        if len(c["content"]) >= MIN_CHUNK:
            chunks.append(c)
        else:
            dropped += 1

    for idx, (hl, i, title) in enumerate(heads):
        if hl != 2:  # 只从 ## 开始
            continue

        body = section_body(lines, heads, idx)
        body_len = sum(len(x) for x in body)
        chapter = next((t for hl2, i2, t in reversed(heads[:idx]) if hl2 == 1), "")

        # 1) 节未超限：直接成块
        if body_len <= TARGET_UPPER:
            content = "\n".join(body).strip()
            if content:
                add(make_chunk(doc, title, content, chapter))
            continue

        # 2) 超长：在节内按 ### 子标题再切
        sec_end = _section_end(lines, heads, idx)
        in_section = [
            (j, i3, t3)
            for j, (h3, i3, t3) in enumerate(heads)
            if h3 == 3 and i < i3 < sec_end
        ]
        if in_section:
            for k, (j2, i3, t3) in enumerate(in_section):
                s_end = in_section[k + 1][1] if k + 1 < len(in_section) else sec_end
                sub_body = lines[i3 + 1 : s_end]
                sub_len = sum(len(x) for x in sub_body)
                if sub_len <= TARGET_UPPER:
                    content = "\n".join(sub_body).strip()
                    if content:
                        add(make_chunk(doc, f"{title} / {t3}", content, chapter, title, t3))
                else:
                    for para_chunk in split_paragraphs(sub_body):
                        add(make_chunk(doc, f"{title} / {t3}", para_chunk, chapter, title, t3))
        else:
            # 3) 节内无 ###：直接按段落切
            for para_chunk in split_paragraphs(body):
                add(make_chunk(doc, title, para_chunk, chapter))

    if dropped:
        print(f"[{doc}] 丢弃 {dropped} 个过短块 (<{MIN_CHUNK}字)")
    return chunks


def _section_end(lines, heads, idx):
    """节（##）的结束行号。"""
    hl, i, _ = heads[idx]
    end = len(lines)
    for hl2, i2, _ in heads[idx + 1 :]:
        if hl2 <= hl:
            end = i2
            break
    return end


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="rag_chunks.json", help="输出 JSON 路径")
    args = ap.parse_args()

    all_chunks = []
    for f in SRC_FILES:
        if not f.exists():
            print(f"[warn] 跳过不存在的文件: {f}")
            continue
        cs = build_chunks(f)
        print(f"{f.name}: {len(cs)} chunks")
        all_chunks.extend(cs)

    out = Path(args.out)
    out.write_text(json.dumps(all_chunks, ensure_ascii=False, indent=1), encoding="utf-8")

    lens = [len(c["content"]) for c in all_chunks]
    lens.sort()
    print(f"\n总计 {len(all_chunks)} chunks -> {out}")
    if lens:
        print(
            f"字数: min={lens[0]}, 中位={lens[len(lens)//2]}, "
            f"p90={lens[int(len(lens)*0.9)]}, max={lens[-1]}"
        )
    missing = sum(1 for c in all_chunks if not c["meta"]["chapter"])
    print(f"缺 chapter 元数据: {missing}")


if __name__ == "__main__":
    main()
