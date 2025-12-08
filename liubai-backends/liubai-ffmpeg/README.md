# liubai-ffmpeg

一个将 `.amr` 文件转为 `.mp3` 的后端服务。

使用到了 `ffmpeg` 和 `devbox`。

## 前置工作

创建一个 `express` 框架的 `devbox` 后，用 SSH 打开本地编辑器连接到远程 `devbox` 所在的机器上。

删掉里头的所有文件，然后运行：

```shell
git clone https://github.com/yexianbei/liubai.git
```

在根目录创建 `entrypoint.sh` 文件，复制贴上以下内容：

```shell
cd ./liubai/liubai-backends/liubai-ffmpeg
pnpm dev
```

接着运行以下命令，安装依赖:

```shell
chmod +x entrypoint.sh    # 为 entrypoint.sh 添加可执行的权限
cd ./liubai/liubai-backends/liubai-ffmpeg
pnpm i
```


## 安装 ffmpeg

```shell
sudo apt update && sudo apt upgrade    # press Y to continue
sudo apt install ffmpeg                # press Y to continue
ffmpeg -version                        # verify if installed successfully
```

## 启动服务

`pnpm dev` 启动服务。