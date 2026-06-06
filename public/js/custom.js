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
<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyB2IRqmq0ZGu4xFIMK2ij6sOBnM8UjYFGo",
    authDomain: "notionnext-fa36a.firebaseapp.com",
    projectId: "notionnext-fa36a",
    storageBucket: "notionnext-fa36a.firebasestorage.app",
    messagingSenderId: "758537767817",
    appId: "1:758537767817:web:d9a999ae2111db34c02f58",
    measurementId: "G-5DJB70VWDJ"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>
