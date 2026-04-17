import pandas as pd
from datasets import load_dataset

def download_uspto_to_excel():
    print("正在从 Hugging Face 获取 USPTO-50K 数据集...")
    
    # 提取开源社区已上传整理好的 uspto-50k
    # 该数据集通常包含了标准的训练集(train)、验证集(validation)和测试集(test)
    dataset = load_dataset("pingzhili/uspto-50k")
    
    dfs = []
    
    # 遍历不同的拆分（train, validation, test）
    for split in dataset.keys():
        print(f"正在处理 {split} 集...")
        # 将数据转为 pandas DataFrame
        df_split = dataset[split].to_pandas()
        
        # 增加一列，用于在 Excel 中区分这条数据属于原数据的哪个拆分集
        df_split['dataset_split'] = split 
        dfs.append(df_split)
        
    # 将所有的 DataFrame 上下拼接成一个完整的表格
    df_all = pd.concat(dfs, ignore_index=True)
    
    print(f"\n数据集获取成功！总计包含 {len(df_all)} 条反应数据。")
    print("正在保存为 Excel 文件 (这可能需要十几秒钟的时间，请稍候)...")
    
    # 导出到 Excel（去掉行索引）
    excel_filename = "uspto_50k_dataset.xlsx"
    df_all.to_excel(excel_filename, index=False, engine='openpyxl')
    
    print(f"\n✅ 处理完毕！数据已成功导出至当前目录下的: {excel_filename}")

if __name__ == "__main__":
    download_uspto_to_excel()