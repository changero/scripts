## 脚本列表

### 服务器脚本

- [宝塔破解版](https://www.hostcli.com/)
- [卸载宝塔](./server/bt-uninstall.sh)

### 容器配置文件

- [freenom](./docker/freenom/docker-compose.yml) 自动续费 freenom 注册域名，容器启动完成以后，修改当前目录下的`.env`文件
- [photoprism](./docker/phptoprism/docker-compose.yml) 相册管理，只需要修改下面的属性
  - port: 访问端口
  - `PHOTOPRISM_ADMIN_PASSWORD`: 访问密码
- [青龙面板](./docker/qinglong/docker-compose.yml) 默认端口 5700
- [pi-hole](./docker/pi-hole/docker-compose.yml) 搭建私有 DNS 服务器，可以添加 Local DNS 改变 dns 记录。搭建的时候只需要修改访问密码。[官方仓库](https://github.com/pi-hole/docker-pi-hole)
- [bitwarden](./docker/bitwarden/docker-compose.yml) 搭建私有密码管理服务，拥有众多客户端，要求服务通过 https 访问，[docker hub](https://hub.docker.com/r/vaultwarden/server)地址
- [gotify](./docker/gotify/docker-compose.yml) 搭建私有消息服务器，[官方仓库](https://github.com/gotify/server)
- [v2raya](./docker/v2raya/docker-compose.yml) 在 linux 搭建 v2ray 客户端
- [nodered](./docker/node-red/docker-compose.yml)
- [mongodb](./docker/mongodb/docker-compose.yml)
  - MONGO_INITDB_ROOT_USERNAME： 用户名
  - MONGO_INITDB_ROOT_PASSWORD： 密码
- [snapdrop](./docker/snapdrop/docker-compose.yml) 自己搭建一个共享客户端，只要在同一个 wifi 环境下，就能共享文件。[https://snap.bianqu.tk/](https://snap.bianqu.tk/)
- [jellyfin](./docker/jellyfin/docker-compose.yml) 流媒体服务
- [postgres](./docker/postgres/docker-compose.yml) 数据库，参考[链接](https://blog.csdn.net/yetyrain/article/details/105642488)
  - POSTGRES_USER: 用户
  - POSTGRES_PASSWORD: 密码
  - 访问链接：postgres://用户:密码@postgres:端口

### 油猴脚本

- [百度云 VIP](./tampermonkey/baidu_yun_vip.js) 最新版本在[这里](https://greasyfork.org/zh-CN/scripts/422814-%E7%99%BE%E5%BA%A6%E4%BA%91%E5%8E%BB%E5%B9%BF%E5%91%8A-%E5%BF%AB%E6%8D%B7%E9%94%AE%E5%80%8D%E9%80%9F-%E5%85%8Dvip%E8%A7%A3%E9%94%81%E5%80%8D%E9%80%9F-%E7%94%BB%E8%B4%A8-%E5%85%A8%E7%BD%91%E7%8B%AC%E5%AE%B6)

- [github 镜像](./tampermonkey/github_mirror.js) 在仓库首页显示镜像 clone 地址，可以被下面的增强插件替换。最新版本在[这里](https://greasyfork.org/zh-CN/scripts/398278-github-%E9%95%9C%E5%83%8F%E8%AE%BF%E9%97%AE-%E5%8A%A0%E9%80%9F%E4%B8%8B%E8%BD%BD)

- [github 增强](./tampermonkey/github_improve.js) 高速下载 Git Clone/SSH、Release、Raw、Code(ZIP) 等文件、项目列表单文件快捷下载。最新版本在[这里](https://greasyfork.org/zh-CN/scripts/412245-github-%E5%A2%9E%E5%BC%BA-%E9%AB%98%E9%80%9F%E4%B8%8B%E8%BD%BD)

- [懒人专用](./tampermonkey/lanren.js) 多功能脚本，音乐、视频 VIP，百度网盘直链提取，官方[连接](https://greasyfork.org/zh-CN/scripts/370634-%E6%87%92%E4%BA%BA%E4%B8%93%E7%94%A8-%E5%85%A8%E7%BD%91vip%E8%A7%86%E9%A2%91%E5%85%8D%E8%B4%B9%E7%A0%B4%E8%A7%A3%E5%8E%BB%E5%B9%BF%E5%91%8A-%E5%85%A8%E7%BD%91%E9%9F%B3%E4%B9%90%E7%9B%B4%E6%8E%A5%E4%B8%8B%E8%BD%BD-%E7%9F%A5%E4%B9%8E%E5%A2%9E%E5%BC%BA-%E7%9F%AD%E8%A7%86%E9%A2%91%E6%97%A0%E6%B0%B4%E5%8D%B0%E4%B8%8B%E8%BD%BD-%E7%99%BE%E5%BA%A6%E7%BD%91%E7%9B%98%E7%9B%B4%E6%8E%A5%E4%B8%8B%E8%BD%BD%E7%AD%89%E5%A4%9A%E5%8A%9F%E8%83%BD%E5%B7%A5%E5%85%B7%E7%AE%B1-%E5%8A%9F%E8%83%BD%E5%8F%AF%E7%8B%AC%E7%AB%8B%E5%BC%80%E5%85%B3-%E9%95%BF%E6%9C%9F%E6%9B%B4%E6%96%B0-%E6%94%BE%E5%BF%83%E4%BD%BF%E7%94%A8-v5-4)

- [百度网盘视频播放器](./tampermonkey/baidu_yun_player.js) 修改百度云盘播放器，官方[连接](https://greasyfork.org/zh-CN/scripts/441747-%E7%99%BE%E5%BA%A6%E7%BD%91%E7%9B%98%E8%A7%86%E9%A2%91%E6%92%AD%E6%94%BE%E5%99%A8)

- [BD 网盘视频播放器](./tampermonkey/baidu_yun_player2.js) 去掉了弹窗，官方[连接](https://greasyfork.org/zh-CN/scripts/455103-bd%E7%BD%91%E7%9B%98%E8%A7%86%E9%A2%91%E6%92%AD%E6%94%BE%E5%99%A8)

- [宝塔图片下载](./tampermonkey/bt_img_download.js) 从宝塔下载图片，自用脚本
