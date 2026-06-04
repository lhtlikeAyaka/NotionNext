(function() {
    function injectAnalyticsBridge() {
        
        if (typeof window !== 'undefined' && window.AnalyticsWebInterface) {
            
            
            window.gtag = function(command, eventName, eventParams) {
                if (command === 'event') {
                    var paramsStr = eventParams ? JSON.stringify(eventParams) : "{}";
                    window.AnalyticsWebInterface.logEvent(eventName, paramsStr);
                }
            };
            
window.dataLayer = window.dataLayer || [];
            if (!window.dataLayer.hasBridgeHooked) {
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
                window.dataLayer.hasBridgeHooked = true;
                console.log("Android 统计通道强行挂载成功！");
            }
        }
    }

if (typeof window !== 'undefined') {
        setInterval(injectAnalyticsBridge, 1000);
        injectAnalyticsBridge();
    }
})();
