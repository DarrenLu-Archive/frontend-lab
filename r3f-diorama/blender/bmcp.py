#!/usr/bin/env python3
"""blender-mcp addon 的 socket client。

blender-mcp 的架構是：MCP server (uvx blender-mcp) --JSON/TCP--> Blender addon (127.0.0.1:9876)。
這支直接說同一個協議，所以不必經過 MCP server 轉譯層（也不經過它的遙測）。

用法：
  python3 bmcp.py scene
  python3 bmcp.py code path/to/script.py
  python3 bmcp.py shot out.png
"""

import json
import socket
import sys

HOST, PORT = "127.0.0.1", 9876


def send(cmd_type, params=None, timeout=180.0):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(timeout)
    s.connect((HOST, PORT))
    s.sendall(json.dumps({"type": cmd_type, "params": params or {}}).encode())

    chunks = []
    while True:
        try:
            data = s.recv(1 << 16)
        except socket.timeout:
            break
        if not data:
            break
        chunks.append(data)
        try:
            return json.loads(b"".join(chunks).decode())
        except json.JSONDecodeError:
            continue  # 尚未收完整
    s.close()
    return json.loads(b"".join(chunks).decode())


def main():
    action = sys.argv[1] if len(sys.argv) > 1 else "scene"

    if action == "scene":
        print(json.dumps(send("get_scene_info"), ensure_ascii=False, indent=2))

    elif action == "code":
        code = open(sys.argv[2]).read()
        r = send("execute_code", {"code": code})
        print(json.dumps(r, ensure_ascii=False, indent=2)[:4000])

    elif action == "shot":
        out = sys.argv[2]
        r = send(
            "get_viewport_screenshot",
            {"max_size": 1200, "filepath": out, "format": "png"},
        )
        print(
            json.dumps(
                {k: v for k, v in r.items() if k != "result"}, ensure_ascii=False
            )
        )
        print("saved:", out)

    else:
        print(json.dumps(send(action), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
