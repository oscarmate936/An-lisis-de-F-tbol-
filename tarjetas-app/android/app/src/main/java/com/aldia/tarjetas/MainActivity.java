package com.aldia.tarjetas;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins propios de la app (no vienen de npm): se registran antes
        // de que arranque el puente con la web.
        registerPlugin(WidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
