"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DataCardProps {
    id:string;
    name:string;
    reviewstatus:boolean;
    uploadBy:string;
    onClick?:()=>void;
}

export default function DataCard({id,name,reviewstatus,uploadBy,onClick}:DataCardProps){
return (
    <Card 
      className="cursor-pointer hover:bg-gray-50 transition-colors m-1"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base truncate">{name}</CardTitle>
          <Badge variant={reviewstatus ? "default" : "secondary"}>
            {reviewstatus ? "已审查" : "待审查"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-gray-500">上传者: {uploadBy}</p>
        <p className="text-xs text-gray-400 mt-1">ID: {id}</p>
      </CardContent>
    </Card>
  );}