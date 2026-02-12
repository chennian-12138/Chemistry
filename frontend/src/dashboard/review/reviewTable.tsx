"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ReviewItem {
  id: string
  name: string
  uploadedBy: string
  status: string
}

export default function ReviewPage() {
  const router = useRouter()
  const [data, setData] = useState<ReviewItem[]>([])
  const [page, setPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/review/list`)
      .then(res => res.json())
      .then(setData)
  }, [])

  // 简单的分页逻辑
  const totalPages = Math.ceil(data.length / pageSize)
  const currentData = data.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">待审核词条</h1>
      
      {/* 表格 */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>反应名称</TableHead>
            <TableHead>上传者</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentData.map(item => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.uploadedBy}</TableCell>
              <TableCell>{item.status}</TableCell>
              <TableCell>
                <Button onClick={() => router.push(`/dashboard/review/${item.id}`)}>
                  审核
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* 分页 */}
      <div className="flex items-center gap-2 mt-4">
        <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
          上一页
        </Button>
        <span>第 {page} / {totalPages} 页</span>
        <Button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
          下一页
        </Button>
      </div>
    </div>
  )
}
