package com.ayeapps.ayefinance.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.LocalSize
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.background
import androidx.glance.currentState
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import org.json.JSONArray
import org.json.JSONObject
import java.text.NumberFormat
import java.util.Locale

/**
 * Account model parsed from SharedPreferences.
 */
data class AccountItem(
    val id: String,
    val name: String,
    val type: String,
    val balance: Double,
    val currency: String,
    val colorHex: String?
)

/**
 * Financial summary metrics parsed from SharedPreferences.
 */
data class SummaryData(
    val grandTotal: Double,
    val liquidTotal: Double,
    val savingsTotal: Double,
    val todayExpenses: Double,
    val todayIncome: Double,
    val monthExpenses: Double,
    val monthIncome: Double,
    val rawGrandTotal: String?
)

class CycleAccountAction : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        val isNext = parameters[isNextKey] ?: true
        val prefs = context.getSharedPreferences(AyeFinanceWidget.PREFS_NAME, Context.MODE_PRIVATE)
        val accountsJson = prefs.getString(AyeFinanceWidget.KEY_ACCOUNTS, null)
        val accountsCount = AyeFinanceWidget.parseAccounts(accountsJson).size
        
        updateAppWidgetState(context, glanceId) { mutablePrefs ->
            val currentIndex = mutablePrefs[selectedIndexKey] ?: -1
            var nextIndex = if (isNext) currentIndex + 1 else currentIndex - 1
            
            if (nextIndex > accountsCount - 1) {
                nextIndex = -1
            } else if (nextIndex < -1) {
                nextIndex = accountsCount - 1
            }
            mutablePrefs[selectedIndexKey] = nextIndex
        }
        AyeFinanceWidget().update(context, glanceId)
    }

    companion object {
        val isNextKey = ActionParameters.Key<Boolean>("is_next")
        val selectedIndexKey = intPreferencesKey("selected_account_index")
    }
}

class AyeFinanceWidget : GlanceAppWidget() {

    override val sizeMode: SizeMode = SizeMode.Responsive(
        setOf(
            DpSize(110.dp, 110.dp),
            DpSize(200.dp, 110.dp),
            DpSize(200.dp, 200.dp)
        )
    )

    companion object {
        const val PREFS_NAME = "AyeFinanceWidgetPrefs"
        const val KEY_SUMMARY = "ayefinance_summary"
        const val KEY_ACCOUNTS = "ayefinance_accounts"

        const val DEEP_LINK_APP = "ayefinance://"
        const val DEEP_LINK_EXPENSE = "ayefinance://transaction/new?type=gasto"
        const val DEEP_LINK_INCOME = "ayefinance://transaction/new?type=ingreso"

        val AccentAmber = Color(0xFFFE9D01)
        val BackgroundDark = Color(0xFF0D0E12)
        val CardSurface = Color(0xFF16181F)
        val ActionSurface = Color(0xFF1E2028)
        val TextWhite = Color(0xFFFFFFFF)
        val TextMuted = Color(0xFF94A3B8)
        val TextSubtle = Color(0xFF64748B)
        val ExpenseRed = Color(0xFFEF4444)
        val IncomeGreen = Color(0xFF10B981)

        fun parseSummary(jsonString: String?): SummaryData {
            if (jsonString.isNullOrBlank()) {
                return SummaryData(
                    grandTotal = 0.0,
                    liquidTotal = 0.0,
                    savingsTotal = 0.0,
                    todayExpenses = 0.0,
                    todayIncome = 0.0,
                    monthExpenses = 0.0,
                    monthIncome = 0.0,
                    rawGrandTotal = null
                )
            }
            return try {
                val json = JSONObject(jsonString)
                val rawGrand = if (json.isNull("grand_total")) null else json.optString("grand_total").takeIf { it.isNotBlank() }
                val grand = rawGrand?.toDoubleOrNull() ?: json.optDouble("grand_total", 0.0)

                val rawLiquid = if (json.isNull("liquid_total")) null else json.optString("liquid_total")
                val liquid = rawLiquid?.toDoubleOrNull() ?: json.optDouble("liquid_total", 0.0)

                val rawSavings = if (json.isNull("savings_total")) null else json.optString("savings_total")
                val savings = rawSavings?.toDoubleOrNull() ?: json.optDouble("savings_total", 0.0)

                val rawTodayExp = if (json.isNull("today_expenses")) null else json.optString("today_expenses")
                val todayExp = rawTodayExp?.toDoubleOrNull() ?: json.optDouble("today_expenses", 0.0)

                val rawTodayInc = if (json.isNull("today_income")) null else json.optString("today_income")
                val todayInc = rawTodayInc?.toDoubleOrNull() ?: json.optDouble("today_income", 0.0)

                val rawMonthExp = if (json.isNull("month_expenses")) null else json.optString("month_expenses")
                val monthExp = rawMonthExp?.toDoubleOrNull() ?: json.optDouble("month_expenses", 0.0)

                val rawMonthInc = if (json.isNull("month_income")) null else json.optString("month_income")
                val monthInc = rawMonthInc?.toDoubleOrNull() ?: json.optDouble("month_income", 0.0)

                SummaryData(
                    grandTotal = grand,
                    liquidTotal = liquid,
                    savingsTotal = savings,
                    todayExpenses = todayExp,
                    todayIncome = todayInc,
                    monthExpenses = monthExp,
                    monthIncome = monthInc,
                    rawGrandTotal = rawGrand
                )
            } catch (e: Exception) {
                SummaryData(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, null)
            }
        }

        fun parseAccounts(jsonString: String?): List<AccountItem> {
            if (jsonString.isNullOrBlank()) return emptyList()
            return try {
                val jsonArray = JSONArray(jsonString)
                val accounts = mutableListOf<AccountItem>()
                for (i in 0 until jsonArray.length()) {
                    val obj = jsonArray.getJSONObject(i)
                    val balanceStr = obj.optString("balance", obj.optString("current_balance", "0"))
                    val balance = balanceStr.toDoubleOrNull() ?: obj.optDouble("balance", 0.0)
                    accounts.add(
                        AccountItem(
                            id = obj.optString("id", i.toString()),
                            name = obj.optString("name", "Cuenta"),
                            type = obj.optString("type", obj.optString("account_type", "general")),
                            balance = balance,
                            currency = obj.optString("currency", "USD"),
                            colorHex = if (obj.isNull("color")) null else obj.optString("color").takeIf { it.isNotBlank() }
                        )
                    )
                }
                accounts
            } catch (e: Exception) {
                emptyList()
            }
        }
    }

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val summaryJson = prefs.getString(KEY_SUMMARY, null)
        val accountsJson = prefs.getString(KEY_ACCOUNTS, null)

        val summary = parseSummary(summaryJson)
        val accounts = parseAccounts(accountsJson)

        provideContent {
            val prefsState = currentState<Preferences>()
            val selectedIndex = prefsState[CycleAccountAction.selectedIndexKey] ?: -1

            val size = LocalSize.current

            if (size.width <= 110.dp && size.height <= 110.dp) {
                SmallWidgetView(context, summary, accounts, selectedIndex)
            } else if (size.width <= 200.dp && size.height <= 110.dp) {
                MediumWidgetView(context, summary, accounts, selectedIndex)
            } else {
                LargeWidgetView(context, summary, accounts, selectedIndex)
            }
        }
    }
}

@Composable
fun WidgetHeader(title: String) {
    Row(
        modifier = GlanceModifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = GlanceModifier
                .size(8.dp)
                .cornerRadius(4.dp)
                .background(AyeFinanceWidget.AccentAmber)
        ) {}

        Spacer(modifier = GlanceModifier.width(6.dp))

        Text(
            text = title.uppercase(),
            style = TextStyle(
                color = ColorProvider(AyeFinanceWidget.AccentAmber),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold
            ),
            maxLines = 1
        )

        Spacer(modifier = GlanceModifier.defaultWeight())

        Text(
            text = "<",
            modifier = GlanceModifier
                .clickable(actionRunCallback<CycleAccountAction>(actionParametersOf(CycleAccountAction.isNextKey to false)))
                .padding(4.dp),
            style = TextStyle(
                color = ColorProvider(AyeFinanceWidget.TextSubtle),
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
        )
        
        Spacer(modifier = GlanceModifier.width(4.dp))
        
        Text(
            text = ">",
            modifier = GlanceModifier
                .clickable(actionRunCallback<CycleAccountAction>(actionParametersOf(CycleAccountAction.isNextKey to true)))
                .padding(4.dp),
            style = TextStyle(
                color = ColorProvider(AyeFinanceWidget.TextSubtle),
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
        )
    }
}

@Composable
fun SmallWidgetView(context: Context, summary: SummaryData, accounts: List<AccountItem>, selectedIndex: Int) {
    val openAppIntent = createDeepLinkIntent(context, AyeFinanceWidget.DEEP_LINK_APP)
    val name = if (selectedIndex == -1) "TOTAL" else accounts.getOrNull(selectedIndex)?.name ?: "TOTAL"
    val balance = if (selectedIndex == -1) summary.grandTotal else accounts.getOrNull(selectedIndex)?.balance ?: 0.0
    val rawAmount = if (selectedIndex == -1) summary.rawGrandTotal else null
    val formatted = formatDisplayAmount(rawAmount, balance)

    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(AyeFinanceWidget.BackgroundDark)
            .cornerRadius(16.dp)
            .padding(10.dp)
            .clickable(actionStartActivity(openAppIntent)),
        verticalAlignment = Alignment.Top,
        horizontalAlignment = Alignment.Start
    ) {
        WidgetHeader(name)
        Spacer(modifier = GlanceModifier.height(8.dp))
        Text(text = "Saldo", style = TextStyle(color = ColorProvider(AyeFinanceWidget.TextMuted), fontSize = 12.sp))
        Spacer(modifier = GlanceModifier.height(2.dp))
        Text(text = formatted, style = TextStyle(color = ColorProvider(AyeFinanceWidget.TextWhite), fontSize = 18.sp, fontWeight = FontWeight.Bold), maxLines = 1)
    }
}

@Composable
fun MediumWidgetView(context: Context, summary: SummaryData, accounts: List<AccountItem>, selectedIndex: Int) {
    val openAppIntent = createDeepLinkIntent(context, AyeFinanceWidget.DEEP_LINK_APP)
    val name = if (selectedIndex == -1) "PATRIMONIO" else accounts.getOrNull(selectedIndex)?.name ?: "PATRIMONIO"
    val balance = if (selectedIndex == -1) summary.grandTotal else accounts.getOrNull(selectedIndex)?.balance ?: 0.0
    val rawAmount = if (selectedIndex == -1) summary.rawGrandTotal else null
    val formatted = formatDisplayAmount(rawAmount, balance)

    val expenseIntent = createDeepLinkIntent(context, AyeFinanceWidget.DEEP_LINK_EXPENSE)
    val incomeIntent = createDeepLinkIntent(context, AyeFinanceWidget.DEEP_LINK_INCOME)

    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(AyeFinanceWidget.BackgroundDark)
            .cornerRadius(16.dp)
            .padding(14.dp)
            .clickable(actionStartActivity(openAppIntent)),
        verticalAlignment = Alignment.Top,
        horizontalAlignment = Alignment.Start
    ) {
        WidgetHeader(name)
        Spacer(modifier = GlanceModifier.height(8.dp))
        Text(text = "Saldo", style = TextStyle(color = ColorProvider(AyeFinanceWidget.TextMuted), fontSize = 12.sp))
        Spacer(modifier = GlanceModifier.height(2.dp))
        Text(text = formatted, style = TextStyle(color = ColorProvider(AyeFinanceWidget.TextWhite), fontSize = 20.sp, fontWeight = FontWeight.Bold), maxLines = 1)
        
        Spacer(modifier = GlanceModifier.defaultWeight())
        QuickActions(expenseIntent, incomeIntent)
    }
}

@Composable
fun LargeWidgetView(context: Context, summary: SummaryData, accounts: List<AccountItem>, selectedIndex: Int) {
    val openAppIntent = createDeepLinkIntent(context, AyeFinanceWidget.DEEP_LINK_APP)
    val name = if (selectedIndex == -1) "AYEFINANCE" else accounts.getOrNull(selectedIndex)?.name ?: "AYEFINANCE"
    val balance = if (selectedIndex == -1) summary.grandTotal else accounts.getOrNull(selectedIndex)?.balance ?: 0.0
    val rawAmount = if (selectedIndex == -1) summary.rawGrandTotal else null
    val formatted = formatDisplayAmount(rawAmount, balance)

    val expenseIntent = createDeepLinkIntent(context, AyeFinanceWidget.DEEP_LINK_EXPENSE)
    val incomeIntent = createDeepLinkIntent(context, AyeFinanceWidget.DEEP_LINK_INCOME)

    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(AyeFinanceWidget.BackgroundDark)
            .cornerRadius(16.dp)
            .padding(14.dp)
            .clickable(actionStartActivity(openAppIntent)),
        verticalAlignment = Alignment.Top,
        horizontalAlignment = Alignment.Start
    ) {
        WidgetHeader(name)
        Spacer(modifier = GlanceModifier.height(8.dp))
        Text(text = "Saldo Total", style = TextStyle(color = ColorProvider(AyeFinanceWidget.TextMuted), fontSize = 12.sp))
        Spacer(modifier = GlanceModifier.height(2.dp))
        Text(text = formatted, style = TextStyle(color = ColorProvider(AyeFinanceWidget.TextWhite), fontSize = 24.sp, fontWeight = FontWeight.Bold), maxLines = 1)
        
        Spacer(modifier = GlanceModifier.height(6.dp))
        
        if (selectedIndex == -1) {
            val formattedLiquid = formatCurrency(summary.liquidTotal)
            val formattedSavings = formatCurrency(summary.savingsTotal)
            Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(text = "Disponible: ", style = TextStyle(color = ColorProvider(AyeFinanceWidget.TextSubtle), fontSize = 11.sp))
                Text(text = formattedLiquid, style = TextStyle(color = ColorProvider(AyeFinanceWidget.TextWhite), fontSize = 11.sp, fontWeight = FontWeight.Medium))
                Spacer(modifier = GlanceModifier.width(12.dp))
                Text(text = "Ahorros: ", style = TextStyle(color = ColorProvider(AyeFinanceWidget.TextSubtle), fontSize = 11.sp))
                Text(text = formattedSavings, style = TextStyle(color = ColorProvider(AyeFinanceWidget.TextWhite), fontSize = 11.sp, fontWeight = FontWeight.Medium))
            }
        } else {
            val type = accounts.getOrNull(selectedIndex)?.type ?: ""
            val currency = accounts.getOrNull(selectedIndex)?.currency ?: ""
            Text(text = "Tipo: $type  •  Moneda: $currency", style = TextStyle(color = ColorProvider(AyeFinanceWidget.TextSubtle), fontSize = 11.sp))
        }

        Spacer(modifier = GlanceModifier.defaultWeight())
        QuickActions(expenseIntent, incomeIntent)
    }
}

@Composable
fun QuickActions(expenseIntent: Intent, incomeIntent: Intent) {
    Row(
        modifier = GlanceModifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            modifier = GlanceModifier
                .defaultWeight()
                .height(36.dp)
                .cornerRadius(10.dp)
                .background(AyeFinanceWidget.ActionSurface)
                .clickable(actionStartActivity(expenseIntent))
                .padding(horizontal = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "− Gasto",
                style = TextStyle(color = ColorProvider(AyeFinanceWidget.ExpenseRed), fontSize = 13.sp, fontWeight = FontWeight.Bold)
            )
        }
        Spacer(modifier = GlanceModifier.width(8.dp))
        Row(
            modifier = GlanceModifier
                .defaultWeight()
                .height(36.dp)
                .cornerRadius(10.dp)
                .background(AyeFinanceWidget.ActionSurface)
                .clickable(actionStartActivity(incomeIntent))
                .padding(horizontal = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "+ Ingreso",
                style = TextStyle(color = ColorProvider(AyeFinanceWidget.IncomeGreen), fontSize = 13.sp, fontWeight = FontWeight.Bold)
            )
        }
    }
}

/**
 * Creates an explicit view Intent targeted to the host app with deep link URI.
 */
private fun createDeepLinkIntent(context: Context, uriString: String): Intent {
    return Intent(Intent.ACTION_VIEW, Uri.parse(uriString)).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        setPackage(context.packageName)
    }
}

/**
 * Formats a raw amount string (preserves explicit currencies or formats numbers).
 */
private fun formatDisplayAmount(rawAmount: String?, fallbackAmount: Double): String {
    if (!rawAmount.isNullOrBlank()) {
        val trimmed = rawAmount.trim()
        if (trimmed.startsWith("$") || trimmed.startsWith("€")) {
            return trimmed
        }
        val parsed = trimmed.toDoubleOrNull()
        if (parsed != null) {
            return formatCurrency(parsed)
        }
        return trimmed
    }
    return formatCurrency(fallbackAmount)
}

/**
 * Formats a double amount as standard currency ($XX,XXX.XX).
 */
private fun formatCurrency(amount: Double, symbol: String = "$"): String {
    val formatter = NumberFormat.getNumberInstance(Locale.US).apply {
        minimumFractionDigits = 2
        maximumFractionDigits = 2
    }
    return "$symbol${formatter.format(amount)}"
}
