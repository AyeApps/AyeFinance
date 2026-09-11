package com.ayeapps.ayefinance.widget

import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

/**
 * AppWidget receiver for the AyeFinance Jetpack Glance widget.
 * Handles system widget lifecycle events and binds to [AyeFinanceWidget].
 */
class AyeFinanceWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = AyeFinanceWidget()
}
