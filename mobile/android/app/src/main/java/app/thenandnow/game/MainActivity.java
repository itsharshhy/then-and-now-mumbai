package app.thenandnow.game;

import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.io.IOException;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        bridge.setWebViewClient(new PagesClient(bridge));
    }

    /**
     * The site is a static export with one folder per page (play/index.html, bazaar/index.html).
     * Capacitor answers every extensionless path with the root index.html, so serve each page's own
     * index.html here and leave everything else (scripts, data, images) to Capacitor.
     */
    private class PagesClient extends BridgeWebViewClient {

        PagesClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            String host = request.getUrl().getHost();
            String path = request.getUrl().getPath();
            if ("localhost".equals(host) && path != null && !path.equals("/")) {
                String last = request.getUrl().getLastPathSegment();
                if (path.endsWith("/") || (last != null && !last.contains("."))) {
                    String dir = path.endsWith("/") ? path : path + "/";
                    try {
                        InputStream page = getAssets().open("public" + dir + "index.html");
                        return new WebResourceResponse("text/html", "UTF-8", page);
                    } catch (IOException missing) {
                        // not a page of ours: let Capacitor handle it
                    }
                }
            }
            return super.shouldInterceptRequest(view, request);
        }
    }
}
