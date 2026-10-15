package com.aldia.tarjetas;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.util.Calendar;

/**
 * Widget de la pantalla de inicio: muestra el pago más urgente.
 *
 * La web (04_avisos.js) guarda un resumen ya formateado en Preferences
 * (SharedPreferences "CapacitorStorage", clave "aldia.widget"). Aquí solo se
 * calcula cuántos días faltan, para que el texto siga siendo correcto
 * aunque la app no se abra en varios días.
 */
public class AldiaWidget extends AppWidgetProvider {

    static final String PREFS = "CapacitorStorage";
    static final String CLAVE = "aldia.widget";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            manager.updateAppWidget(id, construir(context));
        }
    }

    static void actualizarTodos(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, AldiaWidget.class));
        for (int id : ids) {
            manager.updateAppWidget(id, construir(context));
        }
    }

    static RemoteViews construir(Context context) {
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_aldia);

        Intent abrir = new Intent(context, MainActivity.class);
        abrir.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(context, 0, abrir,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.widget_raiz, pi);

        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String crudo = prefs.getString(CLAVE, null);
        if (crudo == null) {
            v.setTextViewText(R.id.widget_titulo, "Al Día");
            v.setTextViewText(R.id.widget_tarjeta, "Abre la app para ver tus pagos");
            v.setViewVisibility(R.id.widget_monto, View.GONE);
            v.setViewVisibility(R.id.widget_detalle, View.GONE);
            v.setTextViewText(R.id.widget_pie, "");
            return v;
        }
        try {
            JSONObject j = new JSONObject(crudo);
            if (j.optBoolean("discreto", false)) {
                v.setTextViewText(R.id.widget_titulo, "Al Día");
                v.setTextViewText(R.id.widget_tarjeta, "Modo discreto activado");
                v.setViewVisibility(R.id.widget_monto, View.GONE);
                v.setViewVisibility(R.id.widget_detalle, View.GONE);
                v.setTextViewText(R.id.widget_pie, "Toca para abrir");
                return v;
            }
            String fecha = j.optString("fecha", "");
            if (fecha.isEmpty()) {
                v.setTextViewText(R.id.widget_titulo, "Sin pagos pendientes");
                v.setTextViewText(R.id.widget_tarjeta, "¡Estás al día! ✓");
                v.setViewVisibility(R.id.widget_monto, View.GONE);
                v.setViewVisibility(R.id.widget_detalle, View.GONE);
            } else {
                long dias = diasHasta(fecha);
                String cuando;
                if (dias < 0) cuando = "Venció hace " + (-dias) + (dias == -1 ? " día" : " días");
                else if (dias == 0) cuando = "Vence hoy";
                else if (dias == 1) cuando = "Vence mañana";
                else cuando = "Vence en " + dias + " días";
                v.setTextViewText(R.id.widget_titulo, "Próximo pago · " + cuando);
                v.setTextViewText(R.id.widget_tarjeta, j.optString("tarjeta", ""));
                v.setViewVisibility(R.id.widget_monto, View.VISIBLE);
                v.setTextViewText(R.id.widget_monto, j.optString("monto", ""));
                v.setViewVisibility(R.id.widget_detalle, View.VISIBLE);
                v.setTextViewText(R.id.widget_detalle, j.optString("detalle", ""));
            }
            v.setTextViewText(R.id.widget_pie, j.optString("pie", ""));
        } catch (Exception e) {
            v.setTextViewText(R.id.widget_titulo, "Al Día");
            v.setTextViewText(R.id.widget_tarjeta, "Abre la app para actualizar");
        }
        return v;
    }

    /** Días entre hoy (hora local) y una fecha "YYYY-MM-DD". */
    static long diasHasta(String fecha) {
        String[] p = fecha.split("-");
        Calendar objetivo = Calendar.getInstance();
        objetivo.clear();
        objetivo.set(Integer.parseInt(p[0]), Integer.parseInt(p[1]) - 1, Integer.parseInt(p[2]));
        Calendar hoy = Calendar.getInstance();
        Calendar base = Calendar.getInstance();
        base.clear();
        base.set(hoy.get(Calendar.YEAR), hoy.get(Calendar.MONTH), hoy.get(Calendar.DAY_OF_MONTH));
        return Math.round((objetivo.getTimeInMillis() - base.getTimeInMillis()) / 86400000.0);
    }
}
