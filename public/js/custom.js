
(function() {
    // 检查 App 注入的底层原生接口是否存在
    if (window.AnalyticsWebInterface) {
        // 1. 劫持全局 gtag 埋点函数
        window.gtag = function(command, eventName, eventParams) {
            if (command === 'event') {
                var paramsStr = eventParams ? JSON.stringify(eventParams) : "{}";
                window.AnalyticsWebInterface.logEvent(eventName, paramsStr);
            }
        };
        
        // 2. 劫持基础数据池 dataLayer.push，防止 Next.js 框架层绕过 gtag 直接发包
        window.dataLayer = window.dataLayer || [];
        var originalPush = window.dataLayer.push;
        window.dataLayer.push = function() {
            var args = arguments[0];
            if (args && args[0] === 'event') {
                window.AnalyticsWebInterface.logEvent(args[1], args[2] ? JSON.stringify(args[2]) : "{}");
            } else if (args && args.event) {
                window.AnalyticsWebInterface.logEvent(args.event, JSON.stringify(args));
            }
            return originalPush.apply(window.dataLayer, arguments);
        };
        console.log("NotionNext-App 桥接统计已成功挂载，Web 端上报已静音。");
    }
})();
