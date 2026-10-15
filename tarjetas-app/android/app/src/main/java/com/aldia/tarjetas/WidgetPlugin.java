package com.aldia.tarjetas;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Puente mínimo para que la web pida repintar el widget de la pantalla de
 * inicio justo después de guardar su resumen (en Preferences), en vez de
 * esperar a la siguiente actualización periódica de Android.
 */
@CapacitorPlugin(name = "AldiaWidget")
public class WidgetPlugin extends Plugin {
    @PluginMethod
    public void actualizar(PluginCall call) {
        AldiaWidget.actualizarTodos(getContext());
        call.resolve();
    }
}
