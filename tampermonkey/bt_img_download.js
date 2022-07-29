// ==UserScript==
// @name         宝塔图片下载
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        http://nas:8888/files
// @icon         https://www.google.com/s2/favicons?sz=64&domain=undefined.nas
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  let body = null;
  let timer = setInterval(() => {
    const b = $('.preview_body>#preview_images')[0];
    if (!b) {
      body = null;
      return;
    } else if (!body) body = b;
    else return;
    if (b) {
      const canvas = document.createElement('canvas');
      canvas.width = body.naturalWidth;
      canvas.height = body.naturalHeight;
      canvas.style.width = '500px';
      canvas.style.height =
        (body.naturalHeight * 500) / body.naturalWidth + 'px';
      document.body.append(canvas);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        body,
        0,
        0,
        body.naturalWidth,
        body.naturalHeight,
        0,
        0,
        body.naturalWidth,
        body.naturalHeight
      );
      canvas.toBlob((blob) => {
        const u = URL.createObjectURL(blob);
        console.log(u);
        b.src = u;
      });
    }
  }, 1000);
  // Your code here...
})();
