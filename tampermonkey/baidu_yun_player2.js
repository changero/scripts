// ==UserScript==
// @name         BD网盘视频播放器
// @namespace    http://tampermonkey.net/
// @version      0.4.5
// @description  支持PC、移动端播放，支持任意倍速调整，支持记忆、连续播放，支持自由选集，支持画面模式，支持自动、手动添加字幕，。。。。。。
// @author       You
// @match        http*://yun.baidu.com/s/*
// @match        https://pan.baidu.com/s/*
// @match        https://pan.baidu.com/play/video*
// @match        https://pan.baidu.com/mbox/streampage*
// @connect      baidu.com
// @connect      baidupcs.com
// @connect      lc-cn-n1-shared.com
// @require      https://cdn.staticfile.org/localforage/1.10.0/localforage.min.js
// @icon         https://nd-static.bdstatic.com/business-static/pan-center/images/vipIcon/user-level2-middle_4fd9480.png
// @antifeature  ads
// @antifeature  membership
// @antifeature  payment
// @antifeature  referral-link
// @antifeature  tracking
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// ==/UserScript==

(function() {
  'use strict';

  var localforage = window.localforage;
  var obj = {
      video_page: {
          info: [],
          quality: [],
          sub_info: [],
          adToken: ""
      }
  };

  obj.storageFileListSharePage = function () {
      try {
          var currentList = obj.require('system-core:context/context.js').instanceForSystem.list.getCurrentList();
          if (currentList.length) {
              window.sessionStorage.setItem("sharePageFileList", JSON.stringify(currentList));
          }
          else {
              setTimeout(obj.storageFileListSharePage, 500);
          }
      }
      catch (error) { };
      window.onhashchange = function (e) {
          setTimeout(obj.storageFileListSharePage, 500);
      };
      document.querySelector(".fufHyA") && [ ... document.querySelectorAll(".fufHyA") ].forEach(element => {
          element.onclick = function () {
              setTimeout(obj.storageFileListSharePage, 500);
          };
      });
  };

  obj.fileForcePreviewSharePage = function () {
      obj.getJquery()(document).on("click", "#shareqr dd", function(event) {
          try {
              var selectedFile = obj.require('system-core:context/context.js').instanceForSystem.list.getSelected()
              , file = selectedFile[0];
              if (file.category == 1) {
                  var ext = file.server_filename.split(".").pop();
                  if (["ts"].includes(ext)) {
                      window.open("https://pan.baidu.com" + location.pathname + "?fid=" + file.fs_id, "_blank");
                  }
              }
          } catch (error) { }
      });
  };

  obj.playVideoSharePage = function () {
      unsafeWindow.locals.get("file_list", "sign", "timestamp", "share_uk", "shareid", function(file_list, sign, timestamp, share_uk, shareid) {
          if (file_list.length > 1 || file_list[0].mediaType != "video") {
              obj.storageFileListSharePage();
              obj.fileForcePreviewSharePage();
              return;
          }
          obj.video_page.info = file_list;
          var file = file_list[0], resolution = file.resolution, fid = file.fs_id, vip = obj.getVip();
          function getUrl(i) {
              return location.protocol + "//" + location.host + "/share/streaming?channel=chunlei&uk=" + share_uk + "&fid=" + fid + "&sign=" + sign + "&timestamp=" + timestamp + "&shareid=" + shareid + "&type=" + i + "&vip=" + vip + "&jsToken=" + unsafeWindow.jsToken
          }
          obj.getAdToken(getUrl("M3U8_AUTO_480"), function () {
              obj.addQuality(getUrl, resolution);
              obj.useDPlayer();
          });
      });
  };

  obj.fetchVideoInfoHomePage = function (callback) {
      var context = obj.require("system-core:context/context.js").instanceForSystem
      , router = context.router
      , uk = context.locals.get("uk")
      , path = router.query.get("path");
      var jQuery = obj.getJquery()
      , target = jQuery.stringify([path]);
      jQuery.ajax({
          url: "/api/filemetas",
          data: {
              target: target,
              dlink: 1
          },
          success: function(i) {
              if (i && 0 === i.errno && i.info && i.info[0]) {
                  obj.video_page.info = i.info;
                  callback && callback(i.info[0]);
              }
              else {
                  obj.msg("视频加载失败，请刷新页面后重试", "failure");
                  callback && callback("");
              }
          },
          error: function(i) {
              obj.msg("视频加载失败，请刷新页面后重试", "failure");
              callback && callback("");
          }
      })
  };

  obj.playVideoHomePage = function () {
      var context = obj.require("system-core:context/context.js").instanceForSystem
      , router = context.router
      , uk = context.locals.get("uk")
      , path = router.query.get("path")
      , vip = obj.getVip();
      function getUrl (i) {
          return location.protocol + "//" + location.host + "/api/streaming?path=" + encodeURIComponent(path) + "&app_id=250528&clienttype=0&type=" + i + "&vip=" + vip + "&jsToken=" + unsafeWindow.jsToken
      }
      var file = obj.video_page.info[0], resolution = file.resolution;
      obj.getAdToken(getUrl("M3U8_AUTO_480"), function () {
          obj.addQuality(getUrl, resolution);
          obj.useDPlayer();
      });
  };

  obj.playVideoStreamPage = function () {
      var getParam = obj.require("base:widget/tools/service/tools.url.js").getParam;
      var file = {
          from_uk: getParam("from_uk"),
          to: getParam("to"),
          fs_id: getParam("fs_id"),
          name: getParam("name") || "",
          type: getParam("type"),
          md5: getParam("md5"),
          msg_id: getParam("msg_id"),
          path: decodeURIComponent(decodeURIComponent(getParam("path")))
      };
      obj.video_page.info = [ file ];
      function getUrl (i) {
          return location.protocol + "//" + location.host + "/mbox/msg/streaming?from_uk=" + file.from_uk + "&to=" + file.to + "&msg_id=" + file.msg_id + "&fs_id=" + file.fs_id + "&type=" + file.type + "&stream_type=" + i;
      }
      obj.getAdToken(getUrl("M3U8_AUTO_480"), function () {
          obj.addQuality(getUrl, "width:1920,height:1080");
          obj.useDPlayer();
      });
  };

  obj.getAdToken = function (url, callback) {
      var jQuery = obj.getJquery();
      jQuery.ajax({
          url: url,
      }).done(function(n) {
          if (133 === n.errno && 0 !== n.adTime) {
              obj.video_page.adToken = n.adToken;
          }
          callback && callback();
      }).fail(function(n) {
          var t = jQuery.parseJSON(n.responseText);
          if (t && 133 === t.errno && 0 !== t.adTime) {
              obj.video_page.adToken = t.adToken;
          }
          callback && callback();
      });
  };

  obj.getPoster = function() {
      var file = obj.video_page.info.length ? obj.video_page.info[0] : "";
      if (file && file.thumbs) {
          return Object.values(file.thumbs).pop().replace(/size=c\d+_u\d+/, "size=c720_u480");
      }
      return "";
  };

  obj.addQuality = function (getUrl, resolution) {
      var r = {
          1080: "超清 1080P",
          720: "高清 720P",
          480: "流畅 480P",
          360: "省流 360P"
      };
      var freeList = obj.freeList(resolution);
      freeList.forEach(function (a, index) {
          obj.video_page.quality.push({
              name: r[a],
              url: getUrl("M3U8_AUTO_" + a) + "&isplayer=1&check_blue=1&adToken=" + encodeURIComponent(obj.video_page.adToken ? obj.video_page.adToken : ""),
              type: "hls"
          });
      });
  };

  obj.freeList = function (e) {
      e = e || "";
      var t = [480, 360]
      , a = e.match(/width:(\d+),height:(\d+)/) || ["", "", ""]
      , i = +a[1] * +a[2];
      return i ? (i > 409920 && t.unshift(720), i > 921600 && t.unshift(1080), t) : t
  };

  obj.useDPlayer = function () {
      obj.playerSupported(function (result) {
          result && obj.dPlayerStart();
      });
  };

  obj.playerSupported = function (callback) {
      (function laodcdn(urlArr, index) {
          var arr = urlArr[index];
          if (arr) {
              var promises = [];
              arr.forEach(function (url, index) {
                  promises.push(loadScript(url));
              });
              Promise.all(promises).then(function(results) {
                  setTimeout(function () {
                      obj.isAppreciation.length && obj.isAppreciation.toString().length == 1412 && callback && callback(unsafeWindow.DPlayer);
                  }, 0);
              }).catch(function (error) {
                  laodcdn(urlArr, ++index);
              });
          }
          else {
              callback && callback(unsafeWindow.DPlayer);
          }
      })([
          [
              "https://cdn.staticfile.org/hls.js/1.1.5/hls.min.js",
              "https://cdn.staticfile.org/dplayer/1.26.0/DPlayer.min.js",
          ],
          [
              "https://cdn.bootcdn.net/ajax/libs/hls.js/1.1.5/hls.min.js",
              "https://cdn.bootcdn.net/ajax/libs/dplayer/1.26.0/DPlayer.min.js",
          ],
          [
              "https://cdn.jsdelivr.net/npm/hls.js/dist/hls.min.js",
              "https://cdn.jsdelivr.net/npm/dplayer/dist/DPlayer.min.js",
          ],
      ], 0);
      function loadScript (src) {
          if (!window.instances) {
              window.instances = {};
          }
          if (!window.instances[src]) {
              window.instances[src] = new Promise((resolve, reject) => {
                  const script = document.createElement("script")
                  script.src = src;
                  script.type = "text/javascript";
                  script.onload = resolve;
                  script.onerror = reject;
                  document.head.appendChild(script);
              });
          }
          return window.instances[src];
      };
  };

  obj.dPlayerStart = function () {
      var dPlayerNode, videoNode = document.getElementById("video-wrap");
      if (videoNode) {
          dPlayerNode = document.getElementById("dplayer");
          if (!dPlayerNode) {
              dPlayerNode = document.createElement("div");
              dPlayerNode.setAttribute("id", "dplayer");
              dPlayerNode.setAttribute("style", "width: 100%; height: 100%;");
              videoNode.parentNode.replaceChild(dPlayerNode, videoNode);
          }
      }
      else {
          console.warn("尝试再次获取播放器容器");
          return setTimeout(obj.dPlayerStart, 500);
      }
      var quality = obj.video_page.quality, defaultQuality = quality.findIndex(function (item) {
          return item.name == localStorage.getItem("dplayer-quality");
      });
      if (defaultQuality < 0) defaultQuality = 0;
      var options = {
          container: dPlayerNode,
          video: {
              quality: quality,
              defaultQuality: defaultQuality,
              pic: obj.getPoster()
          },
          pluginOptions: {
              hls: {
                  maxBufferLength: 30 * 2 * 10
              }
          },
          subtitle: {
              url: "",
              type: "webvtt",
              fontSize: "5vh",
              bottom: "10%",
              color: "#ffd821",
          },
          autoplay: true,
          screenshot: true,
          hotkey: true,
          airplay: true,
          volume: 1.0,
          contextmenu: [
              {
                  text: "👍 喜欢吗 👍 赞一个 👍",
                  link: "https://pc-index-skin.cdn.bcebos.com/6cb0bccb31e49dc0dba6336167be0a18.png"
              },
              {
                  text: "👍 为爱发电 不再弹出 👍",
                  link: "https://afdian.net/order/create?plan_id=dc4bcdfa5c0a11ed8ee452540025c377&product_type=0",
                  click: obj.showDialog
              },
          ],
          theme: "#b7daff"
      };
      if (obj.sessionGet("isMobile")) {
          options.video.customType = {
              hls: function (video, player) {
                  const hls = new unsafeWindow.Hls();
                  hls.loadSource(video.src);
                  hls.attachMedia(video);
              },
          }
      }
      try {
          var player = new unsafeWindow.DPlayer(options);
          obj.initPlayer(player);
          obj.resetPlayer();
          obj.msg("DPlayer 播放器创建成功");
      } catch (error) {
          obj.msg("播放器创建失败", "failure");
      }
  };

  obj.initPlayer = function (player) {
      obj.playerReady(player, function(player) {
          (obj.onPost.length && obj.onPost.toString().length == 370) || player.destroy();
          (obj.isIntegrity.length && obj.isIntegrity.toString().length == 627) || player.destroy();
          obj.isIntegrity(player, function() {
              const { container } = player;
              var $ = obj.getJquery();
              $(container).nextAll().remove();
              location.pathname == "/mbox/streampage" && $(container).css("height", "480px");
              $("#layoutMain").attr("style", "z-index: 42;");
              $(".header-box").remove();
              $(document).on("change", ".afdian-order", function () {
                  if (this.value) {
                      if (this.value.match(/202[\d]{23,24}/)) {
                          localforage.removeItem("menutap");
                          obj.onPost(this.value, function (users) {
                          });
                      }
                      else {
                          obj.msg("\u6b64\u8ba2\u5355\u53f7\u4e0d\u5408\u89c4\u8303\uff0c\u8bf7\u91cd\u8bd5", "failure");
                      }
                  }
              });
          });
          obj.isAppreciation(function (data) {
              if (data) {
                  obj.gestureInit(player);
                  obj.longPressInit(player);
                  obj.dblclickInit(player);
              }
              else {
                  player.on("contextmenu_show", function () {
                      player.pause();
                  });
              }
          });
          obj.initPlayerEvents(player);
          obj.memoryPlay(player);
          obj.customSpeed(player);
          obj.appreciation(player);
          obj.playSetting();
          obj.videoFit();
          obj.autoPlayEpisode();
          obj.playRecord();
          obj.showPlayRecord();
          obj.addCueVideoSubtitle(function (textTracks) {
              if (textTracks) {
                  obj.selectSubtitles(textTracks);
                  player.subtitle.container.style.textShadow = "1px 0 1px #000, 0 1px 1px #000, -1px 0 1px #000, 0 -1px 1px #000, 1px 1px 1px #000, -1px -1px 1px #000, 1px -1px 1px #000, -1px 1px 1px #000";
                  player.subtitle.container.style.fontFamily = "黑体, Trajan, serif";
              }
          });
      });
  };

  obj.playerReady = function (player, callback) {
      if (player.isReady) {
          callback && callback(player);
      }
      else if (player.video.duration > 0 || player.video.readyState > 2) {
          player.isReady = true;
          callback && callback(player);
      }
      else {
          player.video.ondurationchange = function () {
              player.video.ondurationchange = null;
              player.isReady = true;
              callback && callback(player);
          }
      }
      setTimeout(function () {
          if (player.isReady) {
              obj.sessionRemoveItem("startError");
              var pnum = GM_getValue("pnum", 1);
              GM_setValue("pnum", ++pnum);
              (obj.appreciation.length && obj.appreciation.toString().length == 738) || player.destroy();
              setTimeout(() => { obj.appreciation(player) }, player.video.duration / 2 * 1000);
          }
          else {
              var startError = obj.sessionGet("startError") || 0;
              if (++startError <= 3) {
                  obj.sessionSet("startError", startError);
                  location.reload();
              }
              else {
                  obj.msg("此视频经多次尝试，可能无法正常播放", "failure");
                  obj.sessionRemoveItem("startError");
              }
          }
      }, 5000 + 1000 * obj.sessionGet("startError"));
  };

  obj.isIntegrity = function (player, callback) {
      const { options: { contextmenu } } = player;
      JSON.stringify(contextmenu).includes(6336167) || player.destroy();
      JSON.stringify(contextmenu).includes(2540025) || player.destroy();
      document.querySelector("#dplayer .dplayer-menu-item").addEventListener('click', () => {
          localforage.getItem("menutap", function(error, data) {
              localforage.setItem("menutap", (data = data || 0, ++data));
              data < 30 && GM_setValue("appreciation_show", Date.now() - 86400000 / 2);
          });
      });
      callback && callback();
  };

  obj.isAppreciation = function (callback) {
      localforage.getItem("users", function(error, data) {
          if (data instanceof Object) {
              if (data.expire_time) {
                  var t = data.expire_time, e = Date.parse(t) - Date.now();
                  if (0 < e) {
                      callback && callback(data);
                  }
                  else {
                      obj.usersPost(function (data) {
                          if (data && data.expire_time) {
                              var t = data.expire_time, e = Date.parse(t) - Date.now();
                              if (0 < e) {
                                  localforage.setItem("users", data);
                                  callback && callback(data);
                              }
                              else {
                                  callback && callback("");
                              }
                          }
                          else {
                              localforage.removeItem("users");
                              callback && callback("");
                          }
                      });
                  }
              }
              else {
                  callback && callback("");
              }
          }
          else {
              callback && callback("");
          }
      });
  };

  obj.initPlayerEvents = function (player) {
      player.on("error", function () {
          const { video: { duration } } = player;
          if (duration === 0 || duration === Infinity || duration.toString() === "NaN") {
              if (!obj.sessionGet("isMobile") && confirm("\u89c6\u9891\u52a0\u8f7d\u5931\u8d25\uff0c\u662f\u5426\u5c1d\u8bd5\u624b\u673a\u6a21\u5f0f")) {
                  obj.isAppreciation(function (data) {
                      if (data) {
                          obj.sessionSet("isMobile", 1);
                          location.reload();
                      }
                      else {
                          obj.sessionRemoveItem("isMobile");
                          alert("\u8bf7\u4f7f\u7528\u0020\u7231\u53d1\u7535\u0020\u83b7\u53d6\u6d4b\u8bd5\u8d44\u683c");
                          //player.contextmenu.show(player.container.offsetWidth / 2.5, player.container.offsetHeight / 3);
                      }
                  });
              }
          }
      });
      player.on("ended", function () {
          obj.isAppreciation(function (data) {
              if (data) {
                  localStorage.getItem("dplayer-autoplaynext") == "true" && obj.getJquery()(".next-icon").click();
              }
              else {
                  obj.msg("\u7231\u53d1\u7535\u0020\u81ea\u52a8\u8df3\u8f6c\u4e0b\u4e00\u96c6");
                  //player.contextmenu.show(player.container.offsetWidth / 2.5, player.container.offsetHeight / 3);
              }
          });
      });
      if (localStorage.getItem("dplayer-isfullscreen") == "true") {
          player.fullScreen.request("web");
      }
      player.on("fullscreen", function () {
          localStorage.setItem("dplayer-isfullscreen", true);
          obj.sessionGet("isMobile") && screen.orientation.lock("landscape");
      });
      player.on("fullscreen_cancel", function () {
          player.fullScreen.isFullScreen("web") || localStorage.removeItem("dplayer-isfullscreen");
          obj.sessionGet("isMobile") && screen.orientation.unlock();
      });
      document.querySelector(".dplayer .dplayer-full").addEventListener('click', () => {
          var isFullScreen = player.fullScreen.isFullScreen("web") || player.fullScreen.isFullScreen("browser");
          localStorage.setItem("dplayer-isfullscreen", isFullScreen);
      });
  };

  obj.gestureInit = function (player) {
      if (obj.sessionGet("isMobile")) {
          player.container.classList.add('dplayer-mobile');
          const { video, videoWrap, playedBarWrap } = player.template;

          let isDroging = false, startX = 0, startY = 0, startCurrentTime = 0, startVolume = 0, startBrightness = "100%", lastDirection = 0;
          const onTouchStart = (event) => {
              if (event.touches.length === 1) {
                  isDroging = true;
                  const { clientX, clientY } = event.touches[0];
                  startX = clientX;
                  startY = clientY;
                  startCurrentTime = video.currentTime;
                  startVolume = video.volume;
                  startBrightness = (/brightness\((\d+%?)\)/.exec(video.style.filter) || [])[1] || "100%";
              }
          };
          const onTouchMove = (event) => {
              if (event.touches.length === 1 && isDroging) {
                  const { clientX, clientY } = event.touches[0];
                  const client = player.isRotate ? clientY : clientX;
                  const { width, height } = video.getBoundingClientRect();
                  const ratioX = clamp((clientX - startX) / width, -1, 1);
                  const ratioY = clamp((clientY - startY) / height, -1, 1);
                  const ratio = player.isRotate ? ratioY : ratioX;
                  const direction = getDirection(startX, startY, clientX, clientY);
                  if (direction != lastDirection) {
                      lastDirection = direction;
                      return;
                  }
                  if (direction == 1 || direction == 2) {
                      if (!lastDirection) lastDirection = direction;
                      if (lastDirection > 2) return;
                      const middle = player.isRotate ? height / 2 : width / 2;
                      if (client < middle) {
                          const currentBrightness = clamp(+((/\d+/.exec(startBrightness) || [])[0] || 100) + 200 * ratio * 10, 50, 200);
                          video.style.filter = "brightness(" + currentBrightness.toFixed(0) + "%)";
                          player.notice(`亮度调节 ${currentBrightness.toFixed(0)}%`);
                      }
                      else if (client > middle) {
                          const currentVolume = clamp(startVolume + ratio * 10, 0, 1);
                          player.volume(currentVolume);
                      }
                  }
                  else if (direction == 3 || direction == 4) {
                      if (!lastDirection) lastDirection = direction;
                      if (lastDirection < 3) return;
                      const currentTime = clamp(startCurrentTime + video.duration * ratio * 0.5, 0, video.duration);
                      player.seek(currentTime);
                  }
              }
          };
          const onTouchEnd = () => {
              if (isDroging) {
                  startX = 0;
                  startY = 0;
                  startCurrentTime = 0;
                  startVolume = 0;
                  lastDirection = 0;
                  isDroging = false;
              }
          };
          videoWrap.addEventListener('touchstart', (event) => {
              onTouchStart(event);
          });
          playedBarWrap.addEventListener('touchstart', (event) => {
              onTouchStart(event);
          });
          videoWrap.addEventListener('touchmove', onTouchMove);
          playedBarWrap.addEventListener('touchmove', onTouchMove);
          document.addEventListener('touchend', onTouchEnd);
          window.addEventListener("onorientationchange" in window ? "orientationchange" : "resize", function() {
              if (window.orientation === 180 || window.orientation === 0) {
                  player.isRotate = true;
              }
              else if (window.orientation === 90 || window.orientation === -90 ){
                  player.isRotate = false;
              }
          }, false);
          function clamp(num, a, b) {
              return Math.max(Math.min(num, Math.max(a, b)), Math.min(a, b));
          }
          function getDirection(startx, starty, endx, endy) {
              var angx = endx - startx;
              var angy = endy - starty;
              var result = 0;
              if (Math.abs(angx) < 2 && Math.abs(angy) < 2) return result;
              var angle = Math.atan2(angy, angx) * 180 / Math.PI;
              if (angle >= -135 && angle <= -45) {
                  result = 1;
              } else if (angle > 45 && angle < 135) {
                  result = 2;
              } else if ((angle >= 135 && angle <= 180) || (angle >= -180 && angle < -135)) {
                  result = 3;
              } else if (angle >= -45 && angle <= 45) {
                  result = 4;
              }
              return result;
          }
      }
  };

  obj.longPressInit = function (player) {
      const { video, videoWrap } = player.template;
      let isDroging = false, isLongPress = false, timer = 0, speed = 1;
      const onMouseDown = () => {
          timer = setTimeout(() => {
              isLongPress = true;
              speed = video.playbackRate;
              player.speed(speed * 3);
          },1000);
      }
      const onMouseUp = () => {
          clearTimeout(timer);
          setTimeout(() => {
              if (isLongPress) {
                  isLongPress = false;
                  player.speed(speed);
                  player.play();
              }
          });
      }
      const onTouchStart = (event) => {
          if (event.touches.length === 1) {
              isDroging = true;
              speed = video.playbackRate;
              timer = setInterval(() => {
                  isLongPress = true;
                  player.speed(speed * 3);
                  player.contextmenu.hide();
              },1000);
          }
      };
      const onTouchMove = (event) => {
          if (event.touches.length === 1 && isDroging) {
              clearInterval(timer);
              setTimeout(() => {
                  if (isLongPress) {
                      isLongPress = false;
                      player.speed(speed);
                      player.play();
                  }
              });
          }
      };
      const onTouchEnd = () => {
          if (isDroging) {
              clearInterval(timer);
              setTimeout(() => {
                  if (isLongPress) {
                      isLongPress = false;
                      player.speed(speed);
                      player.play();
                  }
              });
          }
      };

      if (obj.sessionGet("isMobile")) {
          videoWrap.addEventListener('touchstart', onTouchStart);
          videoWrap.addEventListener('touchmove', onTouchMove);
          videoWrap.addEventListener('touchend', onTouchEnd);
      }
      else {
          videoWrap.addEventListener('mousedown', onMouseDown);
          videoWrap.addEventListener('mouseup', onMouseUp);
      }
  };

  obj.dblclickInit = function (player) {
      const { video, videoWrap } = player.template;
      videoWrap.addEventListener('dblclick', (event) => {
          const currentTime = video.currentTime;
          const { offsetX, offsetY } = event;
          const { width, height } = video.getBoundingClientRect();
          const client = player.isRotate ? offsetY : offsetX;
          const middle = player.isRotate ? height / 2 : width / 2;
          if (client < middle) {
              player.seek(currentTime - 30);
          }
          else if (client > middle) {
              player.seek(currentTime + 30);
          }
      });
  };

  obj.memoryPlay = function (player) {
      if (this.hasMemoryDisplay) return;
      this.hasMemoryDisplay = true;
      this.appreciation || player.destroy();
      var duration = player.video.duration
      , file = obj.video_page.info[0] || {}
      , sign = file.md5 || file.fs_id
      , memoryTime = getFilePosition(sign);
      if (memoryTime && parseInt(memoryTime)) {
          var autoPosition = localStorage.getItem("dplayer-autoposition") == "true";
          if (autoPosition) {
              player.seek(memoryTime);
          }
          else {
              var formatTime = formatVideoTime(memoryTime);
              var $ = obj.getJquery();
              $(player.container).append('<div class="memory-play-wrap" style="display: block;position: absolute;left: 30px;bottom: 60px;font-size: 15px;padding: 7px;border-radius: 3px;color: #fff;z-index:100;background: rgba(0,0,0,.5);">上次播放到：' + formatTime + '&nbsp;&nbsp;<a href="javascript:void(0);" class="play-jump" style="text-decoration: none;color: #06c;"> 跳转播放 &nbsp;</a><em class="close-btn" style="display: inline-block;width: 15px;height: 15px;vertical-align: middle;cursor: pointer;background: url(https://nd-static.bdstatic.com/m-static/disk-share/widget/pageModule/share-file-main/fileType/video/img/video-flash-closebtn_15f0e97.png) no-repeat;"></em></div>');
              var memoryTimeout = setTimeout(function () {
                  $(".memory-play-wrap").remove();
              }, 15000);
              $(".memory-play-wrap .close-btn").click(function () {
                  $(".memory-play-wrap").remove();
                  clearTimeout(memoryTimeout);
              });
              $(".memory-play-wrap .play-jump").click(function () {
                  player.seek(memoryTime);
                  player.play();
                  $(".memory-play-wrap").remove();
                  clearTimeout(memoryTimeout);
              });
          }
      }
      document.onvisibilitychange = function () {
          if (document.visibilityState === "hidden") {
              var currentTime = player.video.currentTime;
              currentTime && setFilePosition(sign, currentTime, duration);
          }
      };
      window.onbeforeunload = function () {
          var currentTime = player.video.currentTime;
          currentTime && setFilePosition(sign, currentTime, duration);
      };
      function getFilePosition (e) {
          return localStorage.getItem("video_" + e) || 0;
      }
      function setFilePosition (e, t, o) {
          e && t && (e = "video_" + e, t <= 60 || t + 60 >= o || 0 ? localStorage.removeItem(e) : localStorage.setItem(e, t));
      }
      function formatVideoTime (seconds) {
          var secondTotal = Math.round(seconds)
          , hour = Math.floor(secondTotal / 3600)
          , minute = Math.floor((secondTotal - hour * 3600) / 60)
          , second = secondTotal - hour * 3600 - minute * 60;
          minute < 10 && (minute = "0" + minute);
          second < 10 && (second = "0" + second);
          return hour === 0 ? minute + ":" + second : hour + ":" + minute + ":" + second;
      }
  };

  obj.customSpeed = function (player) {
      var $ = obj.getJquery();
      if ($(".dplayer-setting-speed-item[data-speed='自定义']").length) return;
      this.appreciation || player.destroy();
      var localSpeed = localStorage.getItem("dplayer-speed");
      localSpeed && player.speed(localSpeed);
      $(".dplayer-setting-speed-panel").append('<div class="dplayer-setting-speed-item" data-speed="自定义"><span class="dplayer-label">自定义</span></div>');
      $(".dplayer-setting").append('<div class="dplayer-setting-custom-speed" style="display: none;right: 72px;position: absolute;bottom: 50px;width: 150px;border-radius: 2px;background: rgba(28,28,28,.9);padding: 7px 0;transition: all .3s ease-in-out;overflow: hidden;z-index: 2;"><div class="dplayer-speed-item" style="padding: 5px 10px;box-sizing: border-box;cursor: pointer;position: relative;"><span class="dplayer-speed-label" title="双击恢复正常速度" style="color: #eee;font-size: 13px;display: inline-block;vertical-align: middle;white-space: nowrap;">播放速度：</span><input type="number" style="width: 55px;height: 15px;top: 3px;font-size: 13px;border: 1px solid #fff;border-radius: 3px;text-align: center;" step=".1" min=".1"></div></div>');
      var custombox = $(".dplayer-setting-custom-speed");
      var input = $(".dplayer-setting-custom-speed input");
      input.val(localSpeed || 1);
      input.on("input propertychange", function(e) {
          var valnum = input.val();
          valnum = valnum > 16 ? 16 : valnum < .1 ? .1 : valnum;
          input.val(valnum);
          player.speed(valnum);
      });
      player.on("ratechange", function () {
          const { video: { playbackRate } } = player;
          player.notice("播放速度：" + playbackRate);
          localStorage.setItem("dplayer-speed", playbackRate);
          input.val(playbackRate);
      });
      $(".dplayer-setting-custom-speed span").dblclick(function() {
          input.val(1);
          player.speed(1);
      });
      $(".dplayer-setting-speed-item[data-speed='自定义']").on("click", function() {
          if (document.querySelector(".dplayer .dplayer-menu").classList.contains("dplayer-menu-show")) {
              obj.msg("\u8bf7\u4f7f\u7528\u7231\u53d1\u7535\u4f53\u9a8c\u6d4b\u8bd5\u529f\u80fd");
          }
          else {
              obj.isAppreciation(function (data) {
                  if (data) {
                      custombox.css("display") == "block" ? (custombox.css("display", "none"), player.setting.hide()) : custombox.css("display", "block");
                  }
                  else {
                      //player.contextmenu.show(player.container.offsetWidth / 2.5, player.container.offsetHeight / 3);
                      obj.msg("\u8bf7\u4f7f\u7528\u7231\u53d1\u7535\u4f53\u9a8c\u6d4b\u8bd5\u529f\u80fd");
                  }
              });
          }
      }).prevAll().on("click", function() {
          custombox.css("display", "none");
      });
      player.template.mask.addEventListener("click", function() {
          custombox.css("display", "none");
      });
  };

  obj.playSetting = function () {
      var $ = obj.getJquery();
      if ($(".dplayer-setting-autoposition").length) return;
      var html = '<div class="dplayer-setting-item dplayer-setting-autoposition"><span class="dplayer-label">自动记忆播放</span><div class="dplayer-toggle"><input class="dplayer-toggle-setting-input-autoposition" type="checkbox" name="dplayer-toggle"><label for="dplayer-toggle"></label></div></div>';
      html += '<div class="dplayer-setting-item dplayer-setting-autoplaynext"><span class="dplayer-label">自动连续播放</span><div class="dplayer-toggle"><input class="dplayer-toggle-setting-input-autoplaynext" type="checkbox" name="dplayer-toggle"><label for="dplayer-toggle"></label></div></div>';
      $(".dplayer-setting-origin-panel").append(html);
      localStorage.getItem("dplayer-autoposition") == "true" && ($(".dplayer-toggle-setting-input-autoposition").get(0).checked = true);
      localStorage.getItem("dplayer-autoplaynext") || localStorage.setItem("dplayer-autoplaynext", true);
      localStorage.getItem("dplayer-autoplaynext") == "true" && ($(".dplayer-toggle-setting-input-autoplaynext").get(0).checked = true);
      $(".dplayer-setting-autoposition").on("click", function() {
          var autoposition = !$(".dplayer-toggle-setting-input-autoposition").is(":checked");
          $(".dplayer-toggle-setting-input-autoposition").get(0).checked = autoposition;
          localStorage.setItem("dplayer-autoposition", autoposition);
      });
      $(".dplayer-setting-autoplaynext").on("click", function() {
          var autoplaynext = !$(".dplayer-toggle-setting-input-autoplaynext").is(":checked");
          $(".dplayer-toggle-setting-input-autoplaynext").get(0).checked = autoplaynext;
          localStorage.setItem("dplayer-autoplaynext", autoplaynext);
      });
  };

  obj.videoFit = function () {
      var $ = obj.getJquery();
      if ($(".dplayer-icons-right .btn-select-fit").length) return;
      var html = '<div class="dplayer-quality btn-select-fit"><button class="dplayer-icon dplayer-quality-icon">画面模式</button><div class="dplayer-quality-mask"><div class="dplayer-quality-list"><div class="dplayer-quality-item" data-index="0">原始比例</div><div class="dplayer-quality-item" data-index="1">自动裁剪</div><div class="dplayer-quality-item" data-index="2">拉伸填充</div><div class="dplayer-quality-item" data-index="3">系统默认</div></div></div></div>';
      $(".dplayer-icons-right").prepend(html);
      $(".btn-select-fit .dplayer-quality-item").on("click", function() {
          var vfit = ["none", "cover", "fill", ""][$(this).attr("data-index")];
          document.querySelector("video").style["object-fit"] = vfit;
          $(".btn-select-fit .dplayer-icon").text($(this).text());
      });
  };

  obj.autoPlayEpisode = function () {
      if (obj.getJquery()(".dplayer-icons-right #btn-select-episode").length) return;
      var path = location.pathname.split("/")[1];
      if (path == "s") {
          obj.selectEpisodeSharePage();
      }
      else if (path == "play") {
          obj.selectEpisodeHomePage();
      }
      else if (path == "mbox") {
      }
  };

  obj.selectEpisodeSharePage = function () {
      var fileList = obj.sessionGet("sharePageFileList") || []
      , videoList = fileList.filter(function (item, index) {
          return item.category == 1;
      })
      , file = obj.video_page.info[0]
      , fileIndex = videoList.findIndex(function (item, index) {
          return item.fs_id == file.fs_id;
      });
      if (fileIndex > -1 && videoList.length > 1) {
          obj.createEpisodeElement(videoList, fileIndex, "home");
      }
  };

  obj.selectEpisodeHomePage = function () {
      var videoList = [];
      obj.getJquery()("#videoListView").find(".video-item").each(function () {
          videoList.push({
              server_filename: this.title
          })
      });
      var currpath = obj.require("system-core:context/context.js").instanceForSystem.router.query.get("path");
      var server_filename = currpath.split("/").pop()
      , fileIndex = videoList.findIndex(function (item, index) {
          return item.server_filename == server_filename;
      });
      if (fileIndex > -1 && videoList.length > 1) {
          obj.createEpisodeElement(videoList, fileIndex, "home");
      }
  };

  obj.createEpisodeElement = function (videoList, fileIndex, page) {
      var $ = obj.getJquery();
      var eleitem = "";
      videoList.forEach(function (item, index) {
          if (fileIndex == index) {
              eleitem += '<div class="video-item active" title="' + item.server_filename + '" style="background-color: rgba(0,0,0,.3);color: #0df;cursor: pointer;font-size: 14px;line-height: 35px;overflow: hidden;padding: 0 10px;text-overflow: ellipsis;text-align: center;white-space: nowrap;">' + item.server_filename + '</div>';
          }
          else {
              eleitem += '<div class="video-item" title="' + item.server_filename + '" style="color: #fff;cursor: pointer;font-size: 14px;line-height: 35px;overflow: hidden;padding: 0 10px;text-overflow: ellipsis;text-align: center;white-space: nowrap;">' + item.server_filename + '</div>';
          }
      });
      var html = '<button class="dplayer-icon dplayer-play-icon prev-icon" title="上一集"><svg t="1658231494866" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="22734" width="128" height="128" xmlns:xlink="http://www.w3.org/1999/xlink"><defs><style type="text/css"></style></defs><path d="M757.527273 190.138182L382.510545 490.123636a28.020364 28.020364 0 0 0 0 43.752728l375.016728 299.985454a28.020364 28.020364 0 0 0 45.474909-21.876363V212.014545a28.020364 28.020364 0 0 0-45.474909-21.876363zM249.949091 221.509818a28.020364 28.020364 0 0 0-27.973818 27.973818v525.032728a28.020364 28.020364 0 1 0 55.994182 0V249.483636a28.020364 28.020364 0 0 0-28.020364-27.973818zM747.054545 270.242909v483.514182L444.834909 512l302.173091-241.757091z" fill="#333333" p-id="22735"></path></svg></button>';
      html += '<button id="btn-select-episode" class="dplayer-icon dplayer-quality-icon" title="选集">选集</button> <div class="playlist-content" style="max-width: 80%;max-height: 330px;width: auto;height: auto;box-sizing: border-box;overflow: hidden;position: absolute;left: 0;transition: all .38s ease-in-out;bottom: 52px;overflow-y: auto;transform: scale(0);z-index: 2;"><div class="list" style="background-color: rgba(0,0,0,.3);height: 100%;">' + eleitem + '</div></div>';
      html += '<button class="dplayer-icon dplayer-play-icon next-icon" title="下一集"><svg t="1658231512641" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="23796" xmlns:xlink="http://www.w3.org/1999/xlink" width="128" height="128"><defs><style type="text/css"></style></defs><path d="M248.506182 190.138182l374.970182 299.985454a28.020364 28.020364 0 0 1 0 43.752728L248.552727 833.861818a28.020364 28.020364 0 0 1-45.521454-21.876363V212.014545c0-23.505455 27.182545-36.538182 45.521454-21.876363z m507.485091 31.371636c15.453091 0 28.020364 12.567273 28.020363 27.973818v525.032728a28.020364 28.020364 0 1 1-55.994181 0V249.483636c0-15.453091 12.520727-27.973818 27.973818-27.973818zM258.978909 270.242909v483.514182L561.198545 512 258.978909 270.242909z" fill="#333333" p-id="23797"></path></svg></button>';
      $(".dplayer-icons-right").prepend(html);
      $("#btn-select-episode").on("click", function() {
          var eleEpisode = $(".playlist-content");
          if (eleEpisode.css("transform").match(/\d+/) > 0) {
              eleEpisode.css("transform", "scale(0)");
          }
          else {
              eleEpisode.css("transform", "scale(1)");
              $(".dplayer-mask").addClass("dplayer-mask-show");
              var singleheight = $(".dplayer-icons-right .video-item")[0].offsetHeight;
              var totalheight = $(".dplayer-icons-right .playlist-content").height();
              $(".dplayer-icons-right .playlist-content").scrollTop((fileIndex + 1) * singleheight - totalheight / 2);
          }
      });
      $(".dplayer-mask").on("click",function() {
          var eleEpisode = $(".playlist-content");
          if (eleEpisode.css("transform").match(/\d+/) > 0) {
              eleEpisode.css("transform", "scale(0)");
              $(this).removeClass("dplayer-mask-show");
          }
      });
      $(".playlist-content .video-item").on("click", function() {
          var $this = $(this);
          if ($this.hasClass("active")) return;
          $(".dplayer-mask").removeClass("dplayer-mask-show");
          var oldele = $(".video-item.active");
          oldele.removeClass("active");
          oldele.css({"background-color": "", "color": "#fff"});
          $this.addClass("active");
          $this.css({"background-color": "rgba(0,0,0,.3)", "color": "#0df"});
          try {
              if (page == "share") {
                  location.href = "https://pan.baidu.com" + location.pathname + "?fid=" + videoList[$this.index()].fs_id;
              }
              else if (page == "home") {
                  var currpath = obj.require("system-core:context/context.js").instanceForSystem.router.query.get("path");
                  var t = $this.index();
                  var path = currpath.split("/").slice(0, -1).concat(videoList[t].server_filename).join("/");
                  location.hash = "#/video?path=" + encodeURIComponent(path) + "&t=" + t;
              }
              location.reload();
          } catch (error) { }
      });
      $(".prev-icon").on("click",function () {
          var prevvideo = videoList[fileIndex - 1];
          if (prevvideo) {
              try {
                  if (page == "share") {
                      location.href = "https://pan.baidu.com" + location.pathname + "?fid=" + prevvideo.fs_id;
                  }
                  else if (page == "home") {
                      var currpath = obj.require("system-core:context/context.js").instanceForSystem.router.query.get("path");
                      var t = fileIndex - 1;
                      var path = currpath.split("/").slice(0, -1).concat(videoList[t].server_filename).join("/");
                      location.hash = "#/video?path=" + encodeURIComponent(path) + "&t=" + t;
                  }
                  location.reload();
              } catch (error) { }
          }
          else {
              obj.msg("没有上一集了", "failure");
          }
      });
      $(".next-icon").on("click",function () {
          var nextvideo = videoList[fileIndex + 1];
          if (nextvideo) {
              try {
                  if (page == "share") {
                      location.href = "https://pan.baidu.com" + location.pathname + "?fid=" + nextvideo.fs_id;
                  }
                  else if (page == "home") {
                      var currpath = obj.require("system-core:context/context.js").instanceForSystem.router.query.get("path");
                      var t = fileIndex + 1;
                      var path = currpath.split("/").slice(0, -1).concat(videoList[t].server_filename).join("/");
                      location.hash = "#/video?path=" + encodeURIComponent(path) + "&t=" + t;
                  }
                  location.reload();
              } catch (error) { }
          }
          else {
              obj.msg("没有下一集了", "failure");
          }
      });
  };

  obj.playRecord = function () {
      var file = obj.video_page.info.length ? obj.video_page.info[0] : "";
      localforage.getItem("play_record", function(error, data) {
          data = data || {};
          var repeat = Object.keys(data).filter(function (item) {
              return data[item].fs_id == file.fs_id;
          });
          repeat.forEach(function (t) {
              delete data[t];
          });
          data[ unsafeWindow.locals.get('servertime') || Date.now() ] = file;
          localforage.setItem("play_record", data);
      });
  };

  obj.showPlayRecord = function () {
      if (obj.getJquery()(".g-button.play-record").length) return;
      var path = location.pathname.split("/")[1];
      if (path == "s") {
      }
      else if (path == "play") {
          obj.showPlayRecordHomePage();
      }
      else if (path == "mbox") {
      }
  };

  obj.showPlayRecordHomePage = function () {
      var $ = obj.getJquery();
      if ($(".video-toolbar-buttonbox").length && $(".g-button.play-record").length == 0) {
          $(".video-toolbar-buttonbox").append('<a class="g-button play-record" data-button-id="b9" data-button-index="5" href="javascript:;" title="" node-type="notes"><span class="g-button-right"><em class="icon icon-take-notes" title="观看记录"></em><span class="text" style="width: auto;">观看记录</span></span></a>');
          $(".g-button.play-record").click(function () {
              var box = '<div class="appeal-content">';
              localforage.getItem("play_record", function(error, data) {
                  var part = Object.keys(data || {}).slice(-10);
                  part.reverse();
                  part.forEach(function (t) {
                      box += '<p style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"><a target="_blank" href="https://pan.baidu.com/play/video#/video?path=' + encodeURIComponent(data[t].path) + '" title=' + data[t].server_filename + '>' + data[t].server_filename + '</a></p>';
                  });
                  box += '</div>';
                  var dialog = obj.require("system-core:system/uiService/dialog/dialog.js").verify({
                      title: "观看记录",
                      img: "img",
                      vcode: "vcode"
                  });
                  var $ = obj.getJquery();
                  $(dialog.$dialog).find(".dialog-body").empty().append(box);
                  $(dialog.$dialog).find(".dialog-footer").empty().append("");
                  dialog.show();
              });
          });
      }
      else {
          setTimeout(obj.showPlayRecordHomePage, 500);
      }
  };

  obj.addCueVideoSubtitle = function (callback) {
      obj.getSubList(function (sublist) {
          if (sublist && sublist.length) {
              var video = document.querySelector("video");
              if (video) {
                  var textTracks = video.textTracks;
                  for (let i = 0; i < textTracks.length; i++) {
                      textTracks[i].mode = "hidden" || (textTracks[i].mode = "hidden");
                      if (textTracks[i].cues && textTracks[i].cues.length) {
                          for(let ii = textTracks[i].cues.length - 1; ii >= 0; ii--) {
                              textTracks[i].removeCue(textTracks[i].cues[ii]);
                          }
                      }
                  }
                  sublist.forEach(function (item, index) {
                      if (Array.isArray(item.sarr)) {
                          item.language || (item.language = obj.langDetectSarr(item.sarr));
                          item.label || (item.label = obj.langCodeTransform(item.language));
                          textTracks[index] || video.addTextTrack("subtitles", item.label, item.language);
                          item.sarr.forEach(function (item) {
                              /<b>.*<\/b>/.test(item.text) || (item.text = item.text.split(/\r?\n/).map((item) => `<b>${item}</b>`).join("\n"));
                              var textTrackCue = new VTTCue(item.startTime, item.endTime, item.text);
                              textTrackCue.id = item.index;
                              textTracks[index] && textTracks[index].addCue(textTrackCue);
                          });
                      }
                  });
                  var textTrack = textTracks[0];
                  if (textTrack && textTrack.cues && textTrack.cues.length) {
                      textTrack.mode = "showing";
                      obj.msg("字幕添加成功");
                      callback && callback(textTracks);
                  }
              }
          }
      });
  };

  obj.selectSubtitles = function (textTracks) {
      var $ = obj.getJquery();
      if (textTracks.length <= 1) return;
      if (!obj.appreciation) return;
      if ($(".dplayer-subtitle-btn .dplayer-quality-mask").length) $(".dplayer-subtitle-btn .dplayer-quality-mask").remove();

      var subbtn = $(".dplayer-subtitle-btn").addClass("dplayer-quality");
      var sublist = obj.video_page.sub_info;
      var eleSub = '<div class="dplayer-quality-item subtitle-item" data-index="'+ 0 +'" style="opacity: 0.4;">默认字幕</div>';
      for(var i = 1; i < sublist.length; i++) {
          eleSub += '<div class="dplayer-quality-item subtitle-item" data-index="'+ i +'">'+ sublist[i].label +'</div>';
      }
      var html = '<div class="dplayer-quality-mask"><div class="dplayer-quality-list subtitle-select"> '+ eleSub +'</div></div>'
      subbtn.append(html);

      $(".subtitle-select .subtitle-item").off("click").on("click", function() {
          var $this = $(this), index = $this.attr("data-index");
          if ($this.css("opacity") != .4) {
              $this.css("opacity", .4);
              $this.siblings().css("opacity", "");

              var subitem = sublist[index];
              if (subitem && subitem.sarr && subitem.sarr.length) {
                  for(var i = textTracks[0].cues.length - 1; i >= 0; i--) {
                      textTracks[0].removeCue(textTracks[0].cues[i]);
                  }
                  subitem.sarr.forEach(function (item) {
                      /<b>.*<\/b>/.test(item.text) || (item.text = item.text.split(/\r?\n/).map((item) => `<b>${item}</b>`).join("\n"));
                      var textTrackCue = new VTTCue(item.startTime, item.endTime, item.text);
                      textTrackCue.id = item.index;
                      textTracks[0] && textTracks[0].addCue(textTrackCue);
                  });
              }
          }
      });
  };

  obj.getSubList = function (callback) {
      var file = obj.video_page.info[0];
      var currSubList = JSON.parse(sessionStorage.getItem("subtitle_" + file.fs_id) || "[]");
      obj.subtitleLocalFile(function (sublist) {
          if (Array.isArray(sublist) && sublist.length) {
              currSubList = currSubList.concat(sublist);
              currSubList = obj.video_page.sub_info = obj.sortSubList(currSubList);
              sessionStorage.setItem("subtitle_" + file.fs_id, JSON.stringify(currSubList));
              callback && callback(currSubList);
          }
      });
      if (currSubList && currSubList.length) {
          obj.video_page.sub_info = currSubList;
          return callback && callback(currSubList);
      }
      obj.searchSubList(function (sublist) {
          if (Array.isArray(sublist) && sublist.length) {
              currSubList = currSubList.concat(sublist);
              currSubList = obj.video_page.sub_info = obj.sortSubList(currSubList);
              sessionStorage.setItem("subtitle_" + file.fs_id, JSON.stringify(currSubList));
              callback && callback(currSubList);
          }
      });
  };

  obj.searchSubList = function (callback) {
      var path = location.pathname.split("/")[1];
      if (path == "s") {
          obj.searchSubSharePage(function (subfilelist) {
              if (Array.isArray(subfilelist) && subfilelist.length) {
                  obj.shareDownload(subfilelist, function (result) {
                      if (result && Array.isArray(result.list)) {
                          var fileslen = result.list.length;
                          result.list.forEach(function (item, index) {
                              obj.surlRequest(item.dlink, function (stext) {
                                  var sarr = obj.subtitleParser(stext, subfilelist[index].sext);
                                  if (Array.isArray(sarr)) {
                                      sarr = obj.fuseSubArr(sarr);
                                      subfilelist[index].sarr = sarr;
                                  }
                                  if (--fileslen == 0) {
                                      callback && callback(subfilelist.filter(function (item, index) {
                                          return item.sarr;
                                      }));
                                  }
                              });
                          });
                      }
                      else {
                          callback && callback("");
                      }
                  });
              }
              else {
                  callback && callback("");
              }
          });
      }
      else if (path == "play") {
          obj.searchSubHomePage(function (subfilelist) {
              if (Array.isArray(subfilelist) && subfilelist.length) {
                  obj.download(subfilelist, function (result) {
                      if (result && Array.isArray(result.dlink)) {
                          var fileslen = result.dlink.length;
                          result.dlink.forEach(function (item, index) {
                              obj.surlRequest(item.dlink, function (stext) {
                                  var sarr = obj.subtitleParser(stext, subfilelist[index].sext);
                                  if (Array.isArray(sarr)) {
                                      sarr = obj.fuseSubArr(sarr);
                                      subfilelist[index].sarr = sarr;
                                  }
                                  if (--fileslen == 0) {
                                      callback && callback(subfilelist.filter(function (item, index) {
                                          return item.sarr;
                                      }));
                                  }
                              });
                          });
                      }
                      else {
                          callback && callback("");
                      }
                  });
              }
              else {
                  callback && callback("");
              }
          });
      }
      else if (path == "mbox") {
      }
  };

  obj.searchSubSharePage = function (callback) {
      var filelist = JSON.parse(sessionStorage.getItem("sharePageFileList") || "[]")
      , file = obj.video_page.info[0]
      , filename = file.server_filename.split(".").slice(0, -1).join(".").toLowerCase()
      , sexts = ["webvtt", "vtt", "srt", "ssa", "ass"]
      , subfilelist = filelist.filter(function (item, index) {
          if (item.category !== 6) return false;
          var names = item.server_filename.split(".")
          , ext = names.pop().toLowerCase()
          , name = names.join(".").toLowerCase();
          item.sext = ext;
          return sexts.includes(ext) && (filelist.length == 2 || (name.includes(filename) || filename.includes(name)));
      });
      callback && callback(subfilelist);
  };

  obj.searchSubHomePage = function (callback) {
      var file = obj.video_page.info[0]
      , filename = file.server_filename.split(".").slice(0, -1).join(".");
      obj.search(filename, function (result) {
          if (result && Array.isArray(result.list)) {
              var sexts = ["webvtt", "vtt", "srt", "ssa", "ass"]
              , subfilelist = result.list.filter(function (item, index) {
                  if (item.category !== 6) return false;
                  var names = item.server_filename.split(".")
                  , ext = names.pop().toLowerCase()
                  , name = names.join(".").toLowerCase();
                  filename = filename.toLowerCase();
                  item.sext = ext;
                  return sexts.includes(ext) && (result.list.length == 2 || (name.includes(filename) || filename.includes(name)));
              });
              callback && callback(subfilelist);
          }
          else {
              callback && callback("");
          }
      });
  };

  obj.shareDownload = function (filelist, callback) {
      obj.localsReady(function () {
          unsafeWindow.locals.get("sign", "timestamp", "share_uk", "shareid", function(sign, timestamp, share_uk, shareid) {
              var a = obj.getJquery()
              , s = obj.require("base:widget/tools/service/tools.cookie.js").getCookie
              , data= {
                  uk: share_uk,
                  primaryid: shareid,
                  product: "share",
                  encrypt: 0,
                  extra: a.stringify({sekey: decodeURIComponent(s("BDCLND"))}), //doc-share
                  fid_list: filelist ? obj.getFsidListData(filelist) : "",
                  path_list: "",
                  type: "nolimit",
                  vip: obj.getVip()
              };
              a.ajax({
                  type: "POST",
                  url: "/api/sharedownload?sign=" + sign + "&timestamp=" + timestamp,
                  data: data,
                  dataType: "json",
                  success: function(t, r, i) {
                      t && 0 === +t.errno ? callback && callback(t) : callback && callback("");
                  },
                  error: function(t, e) {
                      callback && callback("");
                  }
              });
          });
      });
  };

  obj.download = function (filelist, callback) {
      obj.localsReady(function () {
          unsafeWindow.locals.get("sign1", "sign2", "sign3", "sign", "timestamp", function(sign1, sign2, sign3, sign, timestamp) {
              var a = obj.getJquery()
              , data= {
                  sign: sign,
                  timestamp: timestamp,
                  fidlist: filelist ? obj.getFsidListData(filelist) : "",
                  type: "dlink",
                  vip: obj.getVip()
              };
              if (null == data.sign) {
                  var m = "";
                  try {
                      m = new Function("return " + sign2)()
                  } catch (_) {
                      throw new Error(_.message)
                  }
                  if ("function" != typeof m) return callback && callback("");
                  data.sign = obj.base64Encode(m(sign3, sign1))
              }
              a.ajax({
                  type: "GET",
                  url: "/api/download",
                  data: data,
                  dataType: "json",
                  success: function(t, r, i) {
                      t && 0 === +t.errno ? callback && callback(t) : callback && callback("");
                  },
                  error: function(t, e) {
                      callback && callback("");
                  }
              });
          });
      });
  };

  obj.search = function (key, callback) {
      var a = obj.getJquery();
      a.ajax({
          type: "GET",
          url: "/api/search",
          data: {
              key: key,
              order: "time",
              desc: 1,
              num: 100,
              page: 1,
              recursion: 1
          },
          dataType: "json",
          success: function(t, r, i) {
              t && 0 === +t.errno ? callback && callback(t) : callback && callback("");
          },
          error: function(t, e) {
              callback && callback("");
          }
      });
  };

  obj.base64Encode = function(t) {
      var e, r, a, o, n, i, s = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      for (a = t.length,
           r = 0,
           e = ""; a > r; ) {
          if ((o = 255 & t.charCodeAt(r++),
               r === a)) {
              (e += s.charAt(o >> 2),
               e += s.charAt((3 & o) << 4),
               e += "==");
              break
          }
          if ((n = t.charCodeAt(r++),
               r === a)) {
              (e += s.charAt(o >> 2),
               e += s.charAt((3 & o) << 4 | (240 & n) >> 4),
               e += s.charAt((15 & n) << 2),
               e += "=");
              break
          }
          i = t.charCodeAt(r++);
          (e += s.charAt(o >> 2),
           e += s.charAt((3 & o) << 4 | (240 & n) >> 4),
           e += s.charAt((15 & n) << 2 | (192 & i) >> 6),
           e += s.charAt(63 & i));
      }
      return e
  };

  obj.localsReady = function(callback) {
      unsafeWindow.locals.get("sign", "timestamp", function(sign, timestamp) {
          if (sign || timestamp) {
              callback && callback();
          }
          else {
              obj.async("base:widget/libs/locals.js", function () {
                  setTimeout(function() {
                      obj.localsReady(callback);
                  }, 500);
              });
          }
      });
  };

  obj.getFsidListData = function(t) {
      var o = obj.require("base:widget/libs/underscore.js");
      o.isArray(t) === !1 && (t = [t]);
      return JSON.stringify(o.pluck(t, "fs_id"))
  };

  obj.subtitleLocalFile = function (callback) {
      obj.localFileRequest(function (fileInfo) {
          if (fileInfo.stext) {
              var sarr = obj.subtitleParser(fileInfo.stext, fileInfo.sext);
              if (Array.isArray(sarr) && sarr.length) {
                  sarr = obj.fuseSubArr(sarr);
                  fileInfo.sarr = sarr;
                  callback && callback([ fileInfo ]);
              }
              else {
                  callback && callback("");
              }
          }
          else {
              callback && callback("");
          }
      });
  };

  obj.localFileRequest = function (callback) {
      var $ = obj.getJquery();
      if ($("#addsubtitle").length) return;
      $("body").append('<input id="addsubtitle" type="file" accept=".srt,.ass,.ssa,.vtt" style="display: none;">');

      var html = '<div class="dplayer-setting-item dplayer-setting-localsubtitle"><span class="dplayer-label">添加本地字幕</span><div class="dplayer-toggle"><svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 32 32"><path d="M22 16l-10.105-10.6-1.895 1.987 8.211 8.613-8.211 8.612 1.895 1.988 8.211-8.613z"></path></svg></div></div>';
      $(".dplayer-setting-origin-panel").append(html);
      $(".dplayer-setting-localsubtitle").on("click", function() {
          $("#addsubtitle").click();
      });
      $(document).on("change", "#addsubtitle", function(event) {
          if (this.files.length) {
              var file = this.files[0];
              var file_ext = file.name.split(".").pop().toLowerCase();
              var sexts = ["webvtt", "vtt", "srt", "ssa", "ass"];
              if (!(file_ext && sexts.includes(file_ext))) {
                  obj.msg("暂不支持此类型文件", "failure");
                  return callback && callback("");
              }

              var reader = new FileReader();
              reader.readAsText(file, 'UTF-8');
              reader.onload = function(event) {
                  var result = reader.result;
                  if (result.indexOf("�") > -1) {
                      return reader.readAsText(file, "GB18030");
                  }
                  else if (result.indexOf("") > -1) {
                      return reader.readAsText(file, "BIG5");
                  }
                  callback && callback({sext: file_ext, stext: result});
              };
              reader.onerror = function(e) {
                  callback && callback("");
              };
          }
          this.value = event.target.value = "";
      });
  };

  obj.surlRequest = function (url, callback) {
      GM_xmlhttpRequest({
          method: "get",
          url : url,
          headers: {
              referer: "https://pan.baidu.com/"
          },
          responseType: "blob",
          onload: function(result) {
              if (!result.status || result.status == 200) {
                  var blob = result.response;
                  var reader = new FileReader();
                  reader.readAsText(blob, "UTF-8");
                  reader.onload = function(e) {
                      var result = reader.result;
                      if (result.indexOf("�") > -1 && !reader.markGBK) {
                          reader.markGBK = true;
                          return reader.readAsText(blob, "GB18030");
                      }
                      else if (result.indexOf("") > -1 && !reader.markBIG5) {
                          reader.markBIG5 = true;
                          return reader.readAsText(blob, "BIG5");
                      }
                      callback && callback(result);
                  };
                  reader.onerror = function(e) {
                      callback && callback("");
                  };
              }
              else {
                  callback && callback("");
              }
          },
          onerror: function (error) {
              callback && callback("");
          }
      });
  };

  obj.subtitleParser = function(stext, sext) {
      if (!stext) return "";
      sext || (stext.indexOf("->") > 0 ? "srt" : stext.indexOf("Dialogue:") > 0 ? "ass" : "");
      sext = sext.toLowerCase();
      var regex, data, items = [];
      switch(sext) {
          case "webvtt":
          case "vtt":
          case "srt":
              stext = stext.replace(/\r/g, "");
              regex = /(\d+)?\n?(\d{0,2}:?\d{2}:\d{2}.\d{3}) -?-> (\d{0,2}:?\d{2}:\d{2}.\d{3})/g;
              data = stext.split(regex);
              data.shift();

              for (let i = 0; i < data.length; i += 4) {
                  items.push({
                      index: items.length,
                      startTime: obj.parseTimestamp(data[i + 1]),
                      endTime: obj.parseTimestamp(data[i + 2]),
                      text: data[i + 3].trim().replace(/{.*?}/g, "").replace(/[a-z]+\:.*\d+\.\d+\%\s/, "")
                  });
              }
              return items;
          case "ssa":
          case "ass":
              stext = stext.replace(/\r\n/g, "");
              regex = /Dialogue: .*?\d+,(\d+:\d{2}:\d{2}\.\d{2}),(\d+:\d{2}:\d{2}\.\d{2}),.*?,\d+,\d+,\d+,.*?,/g;
              data = stext.split(regex);
              data.shift();

              for (let i = 0; i < data.length; i += 3) {
                  items.push({
                      index: items.length,
                      startTime: obj.parseTimestamp(data[i]),
                      endTime: obj.parseTimestamp(data[i + 1]),
                      text: data[i + 2].trim().replace(/\\N/g, "\n").replace(/{.*?}/g, "")
                  });
              }
              return items;
          default:
              console.error("未知字幕格式，无法解析", stext, sext);
              return "";
      }
  };

  obj.parseTimestamp = function(e) {
      var t = e.split(":")
      , n = parseFloat(t.length > 0 ? t.pop().replace(/,/g, ".") : "00.000") || 0
      , r = parseFloat(t.length > 0 ? t.pop() : "00") || 0;
      return 3600 * (parseFloat(t.length > 0 ? t.pop() : "00") || 0) + 60 * r + n;
  };

  obj.langDetectSarr = function (sarr) {
      var t = [
          sarr[parseInt(sarr.length / 3)].text,
          sarr[parseInt(sarr.length / 2)].text,
          sarr[parseInt(sarr.length / 3 * 2)].text
      ].join("").replace(/[<bi\/>\r?\n]*/g, "");

      var e = "eng"
      , i = (t.match(/[\u4e00-\u9fa5]/g) || []).length / t.length;
      (t.match(/[\u3020-\u303F]|[\u3040-\u309F]|[\u30A0-\u30FF]|[\u31F0-\u31FF]/g) || []).length / t.length > .03 ? e = "jpn" : i > .1 && (e = "chi");
      return e;
  };

  obj.langCodeTransform = function (language) {
      return {
          chi: "中文字幕",
          eng: "英文字幕",
          jpn: "日文字幕"
      }[language] || "未知语言";
  };

  obj.sortSubList = function (sublist) {
      var chlist = [], otherlist = [];
      sublist.forEach(function (item, index) {
          if (["chi", "zho"].includes(item.language)) {
              chlist.push(item);
          }
          else {
              otherlist.push(item);
          }
      });
      return chlist.concat(otherlist);
  };

  obj.fuseSubArr = function (sarr) {
      var newsarr = [ sarr.shift() ];
      sarr.forEach(function (item, index) {
          var prevsub = newsarr.slice(-1);
          if (item.startTime == prevsub.startTime && item.endTime == prevsub.endTime) {
              prevsub.text += "\n" + item.text;
          }
          else {
              newsarr.push(item);
          }
      });
      return newsarr;
  };

  obj.appreciation = function (player) {
      if (Date.now() - (GM_getValue("appreciation_show") || 0) > 86400000) {
          setTimeout(() => {
              obj.isAppreciation(function (data) {
                  if (data) {
                      data.notice && obj.msg(data.notice);
                  }
                  else {
                      //ert("\u811a\u672c\u672a\u5728\u4efb\u4f55\u5e73\u53f0\u51fa\u552e\u8fc7\u0020\u5982\u679c\u89c9\u5f97\u559c\u6b22\u591a\u8c22\u60a8\u7684\u8d5e\u8d4f");
                      //////player.contextmenu.show(player.container.offsetWidth / 2.5, player.container.offsetHeight / 3);
                  }
              });
          }, player.video.duration / 30 * 1000);
      }
  };

  obj.onPost = function (on, callback) {
      obj.usersPost(function(data) {
          Date.parse(data.expire_time) === 0 || localforage.setItem("users", Object.assign(data || {}, { expire_time: new Date(Date.now() + 86400000).toISOString() }));
          obj.infoPost(data, on, function (result) {
              callback && callback(result);
          });
      });
  };

  obj.usersPost = function (callback) {
      obj.uinfo(function(data) {
          delete data.request_id;
          obj.users(data, function(users) {
              callback && callback(users);
          });
      });
  };

  obj.users = function(data, callback) {
      obj.ajax({
          type: "post",
          url: "https://sxxf4ffo.lc-cn-n1-shared.com/1.1/users",
          data: JSON.stringify({authData: {baidu: Object.assign(data, {
              uid: data.baidu_name,
              pnum: GM_getValue("pnum", 1),
              scriptHandler: GM_info.scriptHandler,
              version: GM_info.script.version
          })}}),
          headers: {
              "Content-Type": "application/json",
              "X-LC-Id": "sXXf4FFOZn2nFIj7LOFsqpLa-gzGzoHsz",
              "X-LC-Key": "16s3qYecpVJXtVahasVxxq1V"
          },
          success: function (response) {
              callback && callback(response);
          },
          error: function (error) {
              callback && callback("");
          }
      });
  };

  obj.infoPost = function(data, on, callback) {
      delete data.createdAt;
      delete data.updatedAt;
      delete data.objectId;
      obj.ajax({
          type: "post",
          url: "https://sxxf4ffo.lc-cn-n1-shared.com/1.1/classes/baidu",
          data: JSON.stringify(Object.assign(data, {
              ON: on
          })),
          headers: {
              "Content-Type": "application/json",
              "X-LC-Id": "sXXf4FFOZn2nFIj7LOFsqpLa-gzGzoHsz",
              "X-LC-Key": "16s3qYecpVJXtVahasVxxq1V"
          },
          success: function (response) {
              callback && callback(response);
          },
          error: function (error) {
              callback && callback("");
          }
      });
  };

  obj.ajax = function(option) {
      var details = {
          method: option.type || "get",
          url: option.url,
          headers: option.headers,
          headers: option.headers,
          responseType: option.dataType,
          onload: function(result) {
              if (parseInt(result.status / 100) == 2) {
                  var response = result.response;
                  try { response = JSON.parse(response); } catch(a) {};
                  option.success && option.success(response);
              } else {
                  option.error && option.error(result);
              }
          },
          onerror: function(result) {
              option.error && option.error(result.error);
          }
      };
      if (option.data instanceof Object) {
          details.data = Object.keys(option.data).map(function(k) {
              return encodeURIComponent(k) + "=" + encodeURIComponent(option.data[k]).replace("%20", "+");
          }).join("&");
      } else {
          details.data = option.data
      }
      if (option.type.toUpperCase() == "GET" && details.data) {
          details.url = option.url + "?" + details.data;
          delete details.data;
      }
      GM_xmlhttpRequest(details);
  };

  obj.uinfo = function (callback) {
      var a = obj.getJquery();
      a.get("https://pan.baidu.com/rest/2.0/xpan/nas?method=uinfo", function(data, status) {
          status == "success" ? callback && callback(data) : callback && callback("");
      });
  };

  obj.sessionGet = function (key) {
      var item = sessionStorage.getItem(key);
      if (item) {
          try { item = JSON.parse(item) } catch (error) {};
      }
      return item;
  };

  obj.sessionSet = function (key, value) {
      sessionStorage.setItem(key, JSON.stringify(value));
  };

  obj.sessionRemoveItem = function (key) {
      sessionStorage.removeItem(key);
  };

  obj.resetPlayer = function () {
      obj.async("file-widget-1:videoPlay/context.js", function(c) {
          var count, id = count = setInterval(function() {
              var context = c && c.getContext() || {}, playerInstance = context.playerInstance;
              if (playerInstance && playerInstance.player) {
                  clearInterval(id);
                  playerInstance.player.dispose();
                  playerInstance.player = !1;
              }
              else if (++count - id > 60) {
                  clearInterval(id);
              }
          }, 500);
      });
  };

  obj.showDialog = function () {
      var dialog = obj.require("system-core:system/uiService/dialog/dialog.js").verify({
          title: "",
          img: "img",
          vcode: "vcode"
      });
      var $ = obj.getJquery();
      $(dialog.$dialog).find(".dialog-body").empty().append('<div style="padding: 60px 20px; max-height: 300px; overflow-y: auto;"><div style="margin-bottom: 10px;" class="g-center">爱发电订单号：<input value="" style="width: 200px;border: 1px solid #f2f2f2;padding: 4px 5px;" class="afdian-order" type="text"></div><div class="g-center"><p>请在爱发电后复制订单号填入输入框，确认无误关闭即可</p></div><div class="g-center"><a href="https://afdian.net/order/create?plan_id=dc4bcdfa5c0a11ed8ee452540025c377&amp;product_type=0" target="_blank"> 打开爱发电 </a></div></div>');
      $(dialog.$dialog).find(".dialog-footer").empty().append("");
      dialog.show();
  };

  obj.require = function (name) {
      return unsafeWindow.require(name);
  };

  obj.async = function (name, callback) {
      unsafeWindow.require.async(name, callback);
  };

  obj.getJquery = function () {
      return obj.require("base:widget/libs/jquerypacket.js");
  };

  obj.getVip = function () {
      return obj.require("base:widget/vip/vip.js").getVipValue();
  };

  obj.msg = function (msg, mode) {
      obj.require("system-core:system/uiService/tip/tip.js").show({ vipType: "svip", mode: mode || "success", msg: msg});
  };

  obj.run = function () {
      var url = location.href;
      if (url.indexOf(".baidu.com/s/") > 0) {
          obj.playVideoSharePage();
      }
      else if (url.indexOf(".baidu.com/play/video#/video") > 0) {
          obj.fetchVideoInfoHomePage(function (info) {
              if (info) {
                  obj.playVideoHomePage();
              }
          });
          window.onhashchange = function (e) {
              location.reload();
          };
      }
      else if (url.indexOf(".baidu.com/mbox/streampage") > 0) {
          obj.playVideoStreamPage();
      }
  }();

  console.log("=== 百度 网 网 网盘 好 好 好棒棒！===");

  // Your code here...
})();
