"""
简单的Flask服务器，用于提供FuturePreppers前端文件
"""
from flask import Flask, send_from_directory, render_template
import os

app = Flask(__name__, static_folder='.', static_url_path='')

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def send_file(path):
    if os.path.exists(path):
        return send_from_directory('.', path)
    else:
        return "File not found", 404

if __name__ == '__main__':
    print("FuturePreppers前端服务器已启动！")
    print("请访问: http://localhost:3000")
    app.run(host='0.0.0.0', port=3000, debug=True)
