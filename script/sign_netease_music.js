/*
    本作品用于QuantumultX和Surge之间js执行方法的转换
    您只需书写其中任一软件的js,然后在您的js最【前面】追加上此段js即可
    无需担心影响执行问题,具体原理是将QX和Surge的方法转换为互相可调用的方法
    尚未测试是否支持import的方式进行使用,因此暂未export
    如有问题或您有更好的改进方案,请前往 https://github.com/sazs34/TaskConfig/issues 提交内容,或直接进行pull request
*/
// #region 固定头部
let isQuantumultX = $task != undefined; //判断当前运行环境是否是qx
let isSurge = $httpClient != undefined; //判断当前运行环境是否是surge
// http请求
var $task = isQuantumultX ? $task : {};
var $httpClient = isSurge ? $httpClient : {};
// cookie读写
var $prefs = isQuantumultX ? $prefs : {};
var $persistentStore = isSurge ? $persistentStore : {};
// 消息通知
var $notify = isQuantumultX ? $notify : {};
var $notification = isSurge ? $notification : {};
// #endregion 固定头部

// #region 网络请求专用转换
if (isQuantumultX) {
    var errorInfo = {
        error: ''
    };
    $httpClient = {
        get: (url, cb) => {
            var urlObj;
            if (typeof (url) == 'string') {
                urlObj = {
                    url: url
                }
            } else {
                urlObj = url;
            }
            $task.fetch(urlObj).then(response => {
                cb(undefined, response, response.body)
            }, reason => {
                errorInfo.error = reason.error;
                cb(errorInfo, response, '')
            })
        },
        post: (url, cb) => {
            var urlObj;
            if (typeof (url) == 'string') {
                urlObj = {
                    url: url
                }
            } else {
                urlObj = url;
            }
            url.method = 'POST';
            $task.fetch(urlObj).then(response => {
                cb(undefined, response, response.body)
            }, reason => {
                errorInfo.error = reason.error;
                cb(errorInfo, response, '')
            })
        }
    }
}
if (isSurge) {
    $task = {
        fetch: url => {
            //为了兼容qx中fetch的写法,所以永不reject
            return new Promise((resolve, reject) => {
                if (url.method == 'POST') {
                    $httpClient.post(url, (error, response, data) => {
                        if (response) {
                            response.body = data;
                            resolve(response, {
                                error: error
                            });
                        } else {
                            resolve(null, {
                                error: error
                            })
                        }
                    })
                } else {
                    $httpClient.get(url, (error, response, data) => {
                        if (response) {
                            response.body = data;
                            resolve(response, {
                                error: error
                            });
                        } else {
                            resolve(null, {
                                error: error
                            })
                        }
                    })
                }
            })

        }
    }
}
// #endregion 网络请求专用转换

// #region cookie操作
if (isQuantumultX) {
    $persistentStore = {
        read: key => {
            return $prefs.valueForKey(key);
        },
        write: (val, key) => {
            return $prefs.setValueForKey(val, key);
        }
    }
}
if (isSurge) {
    $prefs = {
        valueForKey: key => {
            return $persistentStore.read(key);
        },
        setValueForKey: (val, key) => {
            return $persistentStore.write(val, key);
        }
    }
}
// #endregion

// #region 消息通知
if (isQuantumultX) {
    $notification = {
        post: (title, subTitle, detail) => {
            $notify(title, subTitle, detail);
        }
    }
}
if (isSurge) {
    $notify = function (title, subTitle, detail) {
        $notification.post(title, subTitle, detail);
    }
}
// #endregion

/**
 *
 * [MITM]
 * music.163.com
 *
 * [rewrite_local]
 * ^https:\/\/music\.163\.com\/m\/ url script-response-body neteasemusic.cookie.js
 *
 * [task_local]
 * 1 0 0 * * neteasemusic.js
 *
 */

function sign() {
  const pc = `http://music.163.com/api/point/dailyTask?type=1`;
  const mobile = `http://music.163.com/api/point/dailyTask?type=0`;

  const cookieVal = $prefs.valueForKey('CookieWY');

  let signInfo = {
    pc: {
      processed: false,
      title: `PC端  `,
      resultCode: 0,
      resultMsg: ''
    },
    app: {
      processed: false,
      title: `APP端`,
      resultCode: 0,
      resultMsg: ''
    },
  };
  let pcUrl = {
    url: pc,
    headers: {
      Cookie: cookieVal
    }
  };
  let appUrl = {
    url: mobile,
    headers: {
      Cookie: cookieVal
    }
  };
  $task.fetch(pcUrl).then(response => {
    let result = JSON.parse(response.body)
    signInfo.pc.processed = true;
    signInfo.pc.resultCode = result.code;
    signInfo.pc.resultMsg = result.msg;
    console.log(`${signInfo.pc.title}-开始签到, 编码: ${result.code}, 原因: ${result.msg}`)
    checkResult(signInfo);
  }, reason => {
    signInfo.pc.processed = true;
    signInfo.pc.resultCode = 999;
    console.log(`网易云音乐(PC) 签到错误:${reason.error}`);
    checkResult(signInfo);
  });

  $task.fetch(appUrl).then(response => {
    let result = JSON.parse(response.body)
    signInfo.app.processed = true;
    signInfo.app.resultCode = result.code;
    signInfo.app.resultMsg = result.msg;
    console.log(`${signInfo.app.title}-开始签到, 编码: ${result.code}, 原因: ${result.msg}`)
    checkResult(signInfo);
  }, reason => {
    signInfo.app.processed = true;
    signInfo.app.resultCode = 999;
    console.log(`网易云音乐(APP) 签到错误:${reason.error}`);
    checkResult(signInfo);
  })
}

function checkResult(signInfo) {
  try {
    if (signInfo.pc.processed && signInfo.app.processed) {
      let title = '网易云音乐';
      let subTitle = '双端签到完毕，签到结果：';
      let detail = '';
      if (signInfo.pc.resultCode == 200) {
        detail += `${signInfo.pc.title} 签到成功🎉
`;
      } else if (signInfo.pc.resultCode == -2) {
        detail += `${signInfo.pc.title} 重复签到🎉
`;
      } else if (signInfo.pc.resultCode == 999) {
        detail += `${signInfo.pc.title} 签到失败，详见日志!!
`;
      } else {
        detail += `${signInfo.pc.title} 未知错误，详见日志!!
`;
      }
      if (signInfo.app.resultCode == 200) {
        detail += `${signInfo.app.title} 签到成功🎉`;
      } else if (signInfo.app.resultCode == -2) {
        detail += `${signInfo.app.title} 重复签到🎉`;
      } else if (signInfo.app.resultCode == 999) {
        detail += `${signInfo.app.title} 签到失败，详见日志!!`;
      } else {
        detail += `${signInfo.app.title} 未知错误，详见日志!!`;
      }
      $notify(title, subTitle, detail);
    }
  } catch (e) {
    console.log(`网易云音乐签到-error:${e}`);
  }

}

sign()
