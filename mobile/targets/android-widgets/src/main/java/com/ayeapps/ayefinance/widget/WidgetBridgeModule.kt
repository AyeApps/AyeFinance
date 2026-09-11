package com.ayeapps.ayefinance.widget

import android.content.Context
import android.content.SharedPreferences
import androidx.glance.appwidget.updateAll
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch

class WidgetBridgeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "WidgetBridge"
    }

    private fun updateWidgets() {
        MainScope().launch {
            try {
                AyeFinanceWidget().updateAll(reactApplicationContext)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @ReactMethod
    fun setItem(key: String, value: String, group: String) {
        val prefs: SharedPreferences = reactApplicationContext.getSharedPreferences(group, Context.MODE_PRIVATE)
        val editor = prefs.edit()
        editor.putString(key, value)
        editor.apply()
        
        updateWidgets()
    }

    @ReactMethod
    fun removeItem(key: String, group: String) {
        val prefs: SharedPreferences = reactApplicationContext.getSharedPreferences(group, Context.MODE_PRIVATE)
        val editor = prefs.edit()
        editor.remove(key)
        editor.apply()
        
        updateWidgets()
    }

    @ReactMethod
    fun reloadTimelines() {
        updateWidgets()
    }
}
