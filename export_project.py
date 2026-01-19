import os

# 합칠 파일 확장자들
EXTENSIONS = ['.html', '.css', '.js', '.md']
# 제외할 폴더나 파일
EXCLUDE_DIRS = ['.git', 'node_modules', '__pycache__']
OUTPUT_FILE = 'SFT_Console_Full_Context.txt'

def merge_files():
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
        # 프로젝트 구조 먼저 기록
        outfile.write("=== PROJECT STRUCTURE ===\n")
        for root, dirs, files in os.walk('.'):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            level = root.replace('.', '').count(os.sep)
            indent = ' ' * 4 * (level)
            outfile.write(f"{indent}{os.path.basename(root)}/\n")
            subindent = ' ' * 4 * (level + 1)
            for f in files:
                outfile.write(f"{subindent}{f}\n")
        outfile.write("\n\n")

        # 파일 내용 기록
        for root, dirs, files in os.walk('.'):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for file in files:
                if any(file.endswith(ext) for ext in EXTENSIONS) and file != OUTPUT_FILE and file != 'export_project.py':
                    file_path = os.path.join(root, file)
                    outfile.write(f"{'='*30}\n")
                    outfile.write(f"FILE PATH: {file_path}\n")
                    outfile.write(f"{'='*30}\n")
                    try:
                        with open(file_path, 'r', encoding='utf-8') as infile:
                            outfile.write(infile.read())
                            outfile.write("\n\n")
                    except Exception as e:
                        outfile.write(f"Error reading file: {e}\n\n")
    
    print(f"✅ 완료! '{OUTPUT_FILE}' 파일이 생성되었습니다.")
    print("이 파일을 새로운 젬스(Gems)의 지식(Knowledge)에 업로드하세요.")

if __name__ == '__main__':
    merge_files()