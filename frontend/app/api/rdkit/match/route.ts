import { NextRequest, NextResponse } from "next/server";
import { promisify } from "util";
import { execFile } from "child_process";
import path from "path";

const execFileAsync = promisify(execFile);
const pythonPath = process.env.RDKIT_PYTHON_PATH as string;
const scriptsPath = path.join(process.cwd(), "scripts");

export async function POST(request: NextRequest) {
  try {
    const { smarts, mol_json } = await request.json();

    const { stdout, stderr } = await execFileAsync(pythonPath, [
      path.join(scriptsPath, "match_smarts.py"),
      smarts,
      mol_json,
    ]);

    if (stderr) {
      console.error("Python stderr:", stderr);
    }

    const data = JSON.parse(stdout);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("RDKit error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to run Python script"
    }, { status: 500 });
  }
}
