"""
Demo Prepaid Data Warehouse — Comprehensive Seed Script
Star-schema dimensional model with 12 months historical + 6 months churn forecast.
Run: python backend/seed_demo_data.py
"""

import os
import random
import math
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
import psycopg2
from psycopg2.extras import execute_values

random.seed(42)

DB = dict(host="localhost", port=5432, dbname="telco_lakehouse",
          user="rendara", password="rendara123")

# ── date range ────────────────────────────────────────────────────────────────
DATA_START   = date(2025, 1, 1)
DATA_END     = date(2025, 12, 31)
FUTURE_END   = date(2026, 6, 30)   # 6 months of churn forecasts
N_CUSTOMERS  = 3000

# ── Demo prepaid plan catalogue ──────────────────────────────────
PLANS = [
    # plan_key, plan_name, tier, technology, monthly_fee_sgd, data_gb, voice_minutes, sms_included, validity_days, is_5g, target_segment
    ("hiSIM_starter",   "hi! SIM Starter",          "entry",    "4G",  5,  1,   0,    0,   28, False, "cost_conscious"),
    ("hiSIM_basic",     "hi! SIM Basic",             "entry",    "4G", 10,  3,   0,    0,   28, False, "cost_conscious"),
    ("hiSIM_value",     "hi! SIM Value",             "mid",      "4G", 15,  7,   0,    0,   28, False, "mainstream"),
    ("hiSIM_plus",      "hi! SIM Plus",              "mid",      "4G", 20, 15,   0,    0,   28, False, "mainstream"),
    ("hiSIM_max",       "hi! SIM Max",               "premium",  "4G", 35, 50,   0,    0,   28, False, "heavy_user"),
    ("hiSIM_unlimited", "hi! SIM Unlimited",         "premium",  "4G", 45, 999, 0,    0,   28, False, "heavy_user"),
    ("combo_essential", "hi! Combo Essential",       "mid",      "4G", 15,  3, 100,  100,  28, False, "voice_data"),
    ("combo_plus",      "hi! Combo Plus",            "mid",      "4G", 25,  7, 300,  300,  28, False, "voice_data"),
    ("combo_premium",   "hi! Combo Premium",         "premium",  "4G", 35, 15, 999,  500,  28, False, "voice_data"),
    ("5g_starter",      "hi! 5G Starter",            "mid",      "5G", 28, 20,   0,    0,   28, True,  "tech_savvy"),
    ("5g_max",          "hi! 5G Max",                "premium",  "5G", 38,100,   0,    0,   28, True,  "tech_savvy"),
    ("5g_unlimited",    "hi! 5G Unlimited",          "premium",  "5G", 48, 999,  0,    0,   28, True,  "tech_savvy"),
    ("tourist_7d",      "hi! Tourist SIM 7-Day",     "tourist",  "4G", 15,  5,  30,    0,    7, False, "tourist"),
    ("tourist_30d",     "hi! Tourist SIM 30-Day",    "tourist",  "4G", 28, 15, 100,    0,   30, False, "tourist"),
    ("senior_plus",     "hi! Senior Plus",           "entry",    "4G",  8,  3, 200,  100,  28, False, "senior"),
    ("youth_unlimited", "hi! Youth Unlimited",       "premium",  "5G", 30, 999,  0,    0,   28, True,  "youth"),
]

CHANNELS = [
    ("operator_shop",    "Operator Official Shop",     "retail",   "offline"),
    ("operator_online",  "Operator Website",           "direct",   "online"),
    ("operator_app",     "My Operator App",            "direct",   "mobile"),
    ("cheers_7eleven",  "Cheers / 7-Eleven",         "partner",  "offline"),
    ("challenger",      "Challenger Electronics",    "partner",  "offline"),
    ("courts",          "Courts Singapore",          "partner",  "offline"),
    ("lazada",          "Lazada",                    "marketplace","online"),
    ("shopee",          "Shopee",                    "marketplace","online"),
    ("telesales",       "Operator Telesales",         "direct",   "phone"),
    ("corporate_desk",  "Corporate Service Desk",    "b2b",      "offline"),
]

DEVICES = [
    # brand, model, os, category, is_5g_capable, release_year
    ("Apple",   "iPhone 16 Pro Max",  "iOS",     "flagship",   True,  2024),
    ("Apple",   "iPhone 16",          "iOS",     "flagship",   True,  2024),
    ("Apple",   "iPhone 15",          "iOS",     "flagship",   True,  2023),
    ("Apple",   "iPhone 14",          "iOS",     "premium",    True,  2022),
    ("Apple",   "iPhone SE 3",        "iOS",     "entry",      False, 2022),
    ("Samsung", "Galaxy S25 Ultra",   "Android", "flagship",   True,  2025),
    ("Samsung", "Galaxy S24",         "Android", "flagship",   True,  2024),
    ("Samsung", "Galaxy A55",         "Android", "mid",        True,  2024),
    ("Samsung", "Galaxy A35",         "Android", "mid",        False, 2024),
    ("Samsung", "Galaxy A15",         "Android", "entry",      False, 2023),
    ("Xiaomi",  "14 Ultra",           "Android", "flagship",   True,  2024),
    ("Xiaomi",  "Redmi Note 13 Pro",  "Android", "mid",        True,  2023),
    ("Xiaomi",  "Redmi 13C",          "Android", "entry",      False, 2024),
    ("OPPO",    "Find X8 Pro",        "Android", "flagship",   True,  2024),
    ("OPPO",    "Reno 12",            "Android", "mid",        True,  2024),
    ("Vivo",    "X100 Pro",           "Android", "flagship",   True,  2024),
    ("Google",  "Pixel 9 Pro",        "Android", "flagship",   True,  2024),
    ("Google",  "Pixel 9a",           "Android", "mid",        True,  2024),
    ("Nothing", "Phone (2a)",         "Android", "mid",        False, 2024),
    ("Huawei",  "Pura 70",            "HarmonyOS","premium",   False, 2024),
]

# Singapore planning areas grouped by region
LOCATIONS = {
    "Central":    ["Orchard", "Marina Bay", "Tanjong Pagar", "Novena", "Newton", "Bukit Timah", "Holland Village"],
    "North":      ["Woodlands", "Yishun", "Sembawang", "Mandai", "Admiralty"],
    "Northeast":  ["Punggol", "Sengkang", "Hougang", "Serangoon", "Ang Mo Kio"],
    "East":       ["Tampines", "Bedok", "Pasir Ris", "Changi", "Geylang", "Marine Parade"],
    "West":       ["Jurong East", "Jurong West", "Clementi", "Buona Vista", "Choa Chu Kang", "Tengah"],
}

CAMPAIGNS = [
    # campaign_key, name, type, start_date, end_date, target_segment, offer_description, discount_pct, data_bonus_gb
    ("CNY_2025",       "Chinese New Year Double Data",     "seasonal",     date(2025,1,15), date(2025,2,14), "all",            "Double data for 2 months",              0,  100),
    ("youth_q1",       "Back-to-School Youth Deal",        "segment",      date(2025,1,1),  date(2025,3,31), "youth",          "20% off hi! Youth Unlimited",          20,    0),
    ("5g_migration",   "5G Upgrade Challenge",             "product",      date(2025,3,1),  date(2025,5,31), "tech_savvy",     "Free first month on 5G plan",         100,    0),
    ("roaming_asia",   "Asia Roaming Explorer",            "seasonal",     date(2025,6,1),  date(2025,7,31), "heavy_user",     "Roaming data at local rates",           0,    5),
    ("midyear_boost",  "Mid-Year Data Boost",              "promotional",  date(2025,6,15), date(2025,7,15), "mainstream",     "50% bonus data top-up",                 0,   50),
    ("national_day",   "National Day Loyalty Reward",      "loyalty",      date(2025,7,15), date(2025,8,31), "all",            "SGD 5 credit + bonus 5GB",              0,    5),
    ("senior_care",    "Silver Generation Care Pack",      "segment",      date(2025,8,1),  date(2025,10,31),"senior",         "Extra 100 mins + emergency SMS",        0,    0),
    ("winback_q3",     "We Miss You Win-Back",             "retention",    date(2025,8,1),  date(2025,9,30), "churned",        "50% off 3 months on return",           50,   10),
    ("family_bundle",  "Family Data Share Bundle",         "upsell",       date(2025,9,1),  date(2025,11,30),"mainstream",     "Add family line at SGD 8/month",        0,    0),
    ("yearend_mega",   "Year-End Mega Deal",               "seasonal",     date(2025,11,1), date(2025,12,31),"all",            "3 months at 30% off",                  30,   20),
    ("referral",       "Refer & Earn",                     "referral",     date(2025,1,1),  date(2025,12,31),"all",            "SGD 10 credit per referral",            0,    0),
    ("churn_q1",       "Retention Offer Q1",               "retention",    date(2025,1,1),  date(2025,3,31), "at_risk",        "Free month + plan lock-in discount",   25,    5),
    ("churn_q2",       "Retention Offer Q2",               "retention",    date(2025,4,1),  date(2025,6,30), "at_risk",        "Data upgrade at same price",            0,   15),
    ("churn_q3",       "Retention Offer Q3",               "retention",    date(2025,7,1),  date(2025,9,30), "at_risk",        "Loyalty bonus + rate lock",             0,   10),
    ("churn_q4",       "Retention Offer Q4",               "retention",    date(2025,10,1), date(2025,12,31),"at_risk",        "SGD 15 credit + free device case",      0,    0),
]

COMPETITORS = ["Circles.Life", "M1 Prepaid", "StarHub Prepaid", "TPG Mobile", "GOMO"]

ETHNICITIES = [("Chinese", 0.74), ("Malay", 0.14), ("Indian", 0.09), ("Eurasian", 0.02), ("Others", 0.01)]
HOUSING     = [("HDB", 0.79), ("Private Condo", 0.15), ("Landed", 0.04), ("Rental/Other", 0.02)]

MALAY_NAMES   = ["Ahmad", "Siti", "Muhammad", "Nurul", "Hafiz", "Aishah", "Faiz", "Nadia", "Rizwan", "Hasnah"]
CHINESE_NAMES = ["Wei", "Mei", "Jun", "Li", "Hui", "Jian", "Xin", "Ying", "Hao", "Zhi"]
INDIAN_NAMES  = ["Raj", "Priya", "Kumar", "Anitha", "Vikram", "Kavitha", "Suresh", "Meena", "Arjun", "Deepa"]
OTHER_NAMES   = ["Alex", "Jamie", "Sam", "Chris", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Kim"]

def weighted_choice(choices):
    items, weights = zip(*choices)
    return random.choices(items, weights=weights, k=1)[0]

def rand_date(start, end):
    return start + timedelta(days=random.randint(0, (end - start).days))

def gen_sg_mobile():
    return "65" + str(random.choice([8, 9])) + "".join([str(random.randint(0,9)) for _ in range(7)])

def gen_sg_postal():
    district = random.randint(1, 82)
    return f"{district:02d}{random.randint(100,999)}"

def build_customers(n):
    rows = []
    for i in range(1, n+1):
        ethnicity = weighted_choice(ETHNICITIES)
        gender    = random.choice(["Male", "Female"])
        if ethnicity == "Chinese":   name = random.choice(CHINESE_NAMES)
        elif ethnicity == "Malay":   name = random.choice(MALAY_NAMES)
        elif ethnicity == "Indian":  name = random.choice(INDIAN_NAMES)
        else:                        name = random.choice(OTHER_NAMES)

        age         = random.randint(18, 75)
        age_band    = ("18-25" if age <= 25 else "26-35" if age <= 35 else
                       "36-50" if age <= 50 else "51-65" if age <= 65 else "66+")
        segment     = ("youth" if age <= 25 else "young_adult" if age <= 35 else
                       "adult" if age <= 50 else "senior")
        region      = weighted_choice([(r, 1) for r in LOCATIONS])
        planning    = random.choice(LOCATIONS[region])
        housing     = weighted_choice(HOUSING)
        tenure_yrs  = round(random.uniform(0.1, 10), 1)
        reg_date    = DATA_START - timedelta(days=int(tenure_yrs * 365))
        nps_score   = max(0, min(10, int(random.gauss(7, 2))))
        lifetime_val= round(random.uniform(50, 2000), 2)
        is_active   = random.random() > 0.08   # 8% already churned before period
        preferred_ch= random.choice(["operator_app", "operator_online", "operator_shop", "cheers_7eleven"])

        rows.append((
            i, gen_sg_mobile(), name, gender, ethnicity, age, age_band, segment,
            region, planning, gen_sg_postal(), housing, tenure_yrs, reg_date,
            "active" if is_active else "churned", nps_score, lifetime_val, preferred_ch
        ))
    return rows

def build_dim_date(start, end):
    rows = []
    d = start
    while d <= end:
        wk = d.isocalendar()
        is_ph = d in {  # Singapore public holidays 2025
            date(2025,1,1), date(2025,1,29), date(2025,1,30),
            date(2025,3,31), date(2025,4,18), date(2025,5,1),
            date(2025,5,12), date(2025,6,6), date(2025,8,9),
            date(2025,10,20), date(2025,10,21), date(2025,12,25),
        }
        rows.append((
            d, d.year, d.month, d.day, d.strftime("%B"), d.strftime("%b"),
            (d.month - 1) // 3 + 1, f"Q{(d.month-1)//3+1} {d.year}",
            wk[1], d.strftime("%A"), d.strftime("%a"),
            d.weekday() >= 5, is_ph, d.weekday() >= 5 or is_ph,
            (d - DATA_START).days + 1
        ))
        d += timedelta(days=1)
    return rows

def build_monthly_customer_metrics(customers, plan_map, channel_map):
    """Core fact table: monthly KPIs per customer."""
    rows = []
    for cust in customers:
        cid, msisdn, _, gender, ethnicity, age, age_band, segment = cust[:8]
        region = cust[8]
        is_active = cust[14] == "active"

        # assign initial plan weighted by segment
        if segment == "youth":
            plan_weights = {"youth_unlimited": 4, "5g_starter": 3, "hiSIM_max": 2, "hiSIM_value": 1}
        elif segment == "senior":
            plan_weights = {"senior_plus": 4, "hiSIM_basic": 3, "combo_essential": 2, "hiSIM_value": 1}
        elif segment == "young_adult":
            plan_weights = {"hiSIM_plus": 3, "5g_starter": 3, "combo_plus": 2, "hiSIM_max": 2}
        else:
            plan_weights = {"hiSIM_value": 3, "hiSIM_plus": 3, "combo_essential": 2, "5g_starter": 2, "hiSIM_basic": 1}

        plan_keys = list(plan_weights.keys())
        plan_wts  = list(plan_weights.values())
        current_plan = random.choices(plan_keys, weights=plan_wts, k=1)[0]
        plan_idx = {p[0]: i+1 for i, p in enumerate(PLANS)}

        churn_month = None
        if not is_active:
            churn_month = random.randint(1, 12)

        for m in range(1, 13):
            month_date = date(2025, m, 1)
            is_churned_this_month = (churn_month == m)
            if churn_month and m > churn_month:
                break  # no more records after churn

            plan = next(p for p in PLANS if p[0] == current_plan)
            plan_id = plan_idx[current_plan]
            monthly_fee = plan[4]
            data_allowance_gb = plan[5] if plan[5] != 999 else 100  # treat unlimited as 100 for calc

            # usage simulation based on segment
            if segment == "youth":
                usage_ratio = random.gauss(0.85, 0.15)
            elif segment == "senior":
                usage_ratio = random.gauss(0.35, 0.20)
            else:
                usage_ratio = random.gauss(0.65, 0.20)
            usage_ratio = max(0.02, min(1.05, usage_ratio))

            data_used_gb = round(data_allowance_gb * usage_ratio, 3)
            data_overage_gb = round(max(0, data_used_gb - data_allowance_gb), 3)
            voice_used_min = (int(random.gauss(plan[6] * 0.7, 30)) if plan[6] > 0
                              else int(random.gauss(60, 40)))
            voice_used_min = max(0, voice_used_min)
            sms_sent = max(0, int(random.gauss(30, 20)))
            intl_minutes = max(0, int(random.gauss(10, 15))) if random.random() < 0.3 else 0
            roaming_data_mb = max(0, int(random.gauss(500, 300))) if random.random() < 0.15 else 0

            # revenue
            base_revenue = monthly_fee
            overage_revenue = round(data_overage_gb * 10, 2)  # SGD 10/GB overage
            roaming_revenue = round(roaming_data_mb / 1024 * 8, 2) if roaming_data_mb else 0
            intl_revenue    = round(intl_minutes * 0.05, 2)
            total_revenue   = round(base_revenue + overage_revenue + roaming_revenue + intl_revenue, 2)

            # recharge
            n_recharges = random.choices([0,1,2,3,4,5], weights=[5,30,35,15,10,5])[0]
            avg_recharge = round(monthly_fee / max(1, n_recharges), 2) if n_recharges else 0
            total_recharged = round(avg_recharge * n_recharges, 2)

            # session metrics
            avg_daily_sessions = round(random.gauss(4, 2), 1) if data_used_gb > 0.5 else round(random.gauss(1, 0.5), 1)
            avg_session_duration_min = round(random.gauss(25, 10), 1)
            app_launches = int(random.gauss(15, 8))

            # churn risk indicators
            days_since_recharge = 0 if n_recharges > 0 else random.randint(1, 60)
            support_contacts    = random.choices([0,1,2,3,4], weights=[55,25,12,6,2])[0]
            has_complaint       = support_contacts >= 2 and random.random() < 0.4
            competitor_inquiry  = random.random() < 0.06

            # plan upgrade/downgrade
            plan_changed = False
            if m < 12 and random.random() < 0.05:
                plan_changed = True
                new_plan = random.choices(plan_keys, weights=plan_wts, k=1)[0]
                if new_plan != current_plan:
                    current_plan = new_plan

            rows.append((
                cid, plan_id, plan_idx.get(current_plan, plan_id),
                month_date, m, 2025,
                round(data_used_gb * 1024, 0),   # MB
                round(data_allowance_gb * 1024, 0),
                data_overage_gb,
                voice_used_min, sms_sent, intl_minutes, roaming_data_mb,
                base_revenue, overage_revenue, roaming_revenue, intl_revenue, total_revenue,
                n_recharges, total_recharged,
                avg_daily_sessions, avg_session_duration_min, app_launches,
                days_since_recharge, support_contacts, has_complaint, competitor_inquiry,
                plan_changed, is_churned_this_month
            ))
    return rows

def build_recharge_transactions(customers, plan_map):
    rows = []
    rid = 1
    plan_idx = {p[0]: i+1 for i, p in enumerate(PLANS)}
    denoms = [5, 10, 15, 20, 25, 30, 35, 48, 50]
    methods = ["Credit Card", "PayNow", "Dash", "GrabPay", "GIRO", "Cash", "Cheque", "SingPass Pay"]
    method_weights = [30, 28, 15, 12, 5, 5, 2, 3]

    for cust in customers:
        cid = cust[0]
        segment = cust[7]
        plan_wts = {"youth": "youth_unlimited", "senior": "senior_plus"}.get(segment, "hiSIM_value")

        # ~2-4 recharges per month
        for m in range(1, 13):
            n = random.choices([0,1,2,3,4,5], weights=[5,30,35,15,10,5])[0]
            for _ in range(n):
                txn_date = date(2025, m, random.randint(1, 28))
                amount   = random.choice(denoms)
                method   = random.choices(methods, weights=method_weights, k=1)[0]
                plan_id  = plan_idx.get(plan_wts, 3)
                channel  = random.randint(1, len(CHANNELS))
                is_auto  = random.random() < 0.25
                rows.append((rid, cid, txn_date, amount, method, plan_id, channel, is_auto,
                              "success", random.random() < 0.02))
                rid += 1
    return rows

def build_churn_predictions(customers):
    """
    12 months historical churn predictions (Jan–Dec 2025, with actual outcome)
    + 6 months future predictions (Jan–Jun 2026, no actual outcome yet).
    """
    rows = []
    pid = 1
    for cust in customers:
        cid      = cust[0]
        segment  = cust[7]
        tenure   = cust[12]
        nps      = cust[15]
        is_active = cust[14] == "active"

        # base churn probability influenced by customer attributes
        base_prob = 0.04
        if tenure < 1:    base_prob += 0.03
        if nps <= 5:      base_prob += 0.04
        if nps >= 9:      base_prob -= 0.02
        if segment == "youth":    base_prob += 0.01
        if segment == "senior":   base_prob -= 0.01
        base_prob = max(0.01, min(0.25, base_prob))

        actual_churned_month = None
        if not is_active:
            actual_churned_month = random.randint(1, 12)

        for m in range(1, 19):  # 18 months: Jan 2025 (1) to Jun 2026 (18)
            if m <= 12:
                pred_date = date(2025, m, 1)
                is_future = False
                month_label = f"{date(2025,m,1).strftime('%b %Y')}"
            else:
                month_offset = m - 12
                pred_date = date(2026, month_offset, 1)
                is_future = True
                month_label = f"{date(2026,month_offset,1).strftime('%b %Y')}"

            # add seasonal variation
            season_adj = 0.0
            pred_month = pred_date.month
            if pred_month in [1, 2]:  season_adj = -0.01  # CNY retention
            if pred_month in [6, 7]:  season_adj =  0.02  # mid-year competitor deals
            if pred_month in [11,12]: season_adj = -0.01  # year-end loyalty

            # progressive risk increase for known churners
            if actual_churned_month and not is_future:
                months_to_churn = actual_churned_month - m
                if months_to_churn <= 0:
                    churn_prob = 0.85 + random.uniform(-0.05, 0.1)
                elif months_to_churn == 1:
                    churn_prob = 0.55 + random.uniform(-0.1, 0.15)
                elif months_to_churn == 2:
                    churn_prob = 0.35 + random.uniform(-0.1, 0.1)
                else:
                    churn_prob = base_prob + season_adj + random.uniform(-0.02, 0.02)
            else:
                churn_prob = base_prob + season_adj + random.uniform(-0.02, 0.02)

            churn_prob = round(max(0.01, min(0.98, churn_prob)), 4)
            risk_band  = ("critical" if churn_prob >= 0.5 else
                          "high"     if churn_prob >= 0.25 else
                          "medium"   if churn_prob >= 0.10 else "low")

            # top churn drivers (feature importances in plain English)
            drivers = []
            if churn_prob > 0.2:
                driver_pool = [
                    "Low data usage vs. plan allowance",
                    "No recharge in 30+ days",
                    "Multiple service complaints",
                    "Competitor price inquiry detected",
                    "Plan has not been upgraded in 12+ months",
                    "High overage charges",
                    "NPS score below threshold",
                    "Low app engagement",
                    "Plan expiry without auto-renewal",
                ]
                drivers = random.sample(driver_pool, k=min(3, int(churn_prob * 10) + 1))
            top_driver = drivers[0] if drivers else "No significant risk indicators"

            if not is_future:
                actual_churned = (actual_churned_month == m)
            else:
                actual_churned = None  # unknown for future months

            recommended_action = (
                "Immediate win-back call + 50% discount offer" if risk_band == "critical" else
                "Personalised retention SMS + data bonus"      if risk_band == "high"     else
                "Loyalty reward + plan upgrade suggestion"     if risk_band == "medium"   else
                "Standard engagement — monitor"
            )

            model_version = "ChurnNet v2.3" if is_future else "ChurnNet v2.2"

            rows.append((
                pid, cid, pred_date, month_label, churn_prob, risk_band,
                top_driver, recommended_action, is_future,
                actual_churned, model_version
            ))
            pid += 1
    return rows

def build_campaign_enrollments(customers, campaigns_idx):
    rows = []
    eid = 1
    for cust in customers:
        cid     = cust[0]
        segment = cust[7]
        age     = cust[5]

        for i, camp in enumerate(CAMPAIGNS):
            camp_key, _, camp_type, c_start, c_end, target_seg, _, discount, bonus = camp
            camp_id = i + 1

            # eligibility
            eligible = (
                target_seg == "all" or
                (target_seg == "youth"     and segment == "youth") or
                (target_seg == "senior"    and segment == "senior") or
                (target_seg == "tech_savvy"and age <= 40) or
                (target_seg == "heavy_user"and segment in ["young_adult","adult"]) or
                (target_seg == "mainstream"and segment in ["young_adult","adult"]) or
                (target_seg == "at_risk"   and random.random() < 0.2) or
                (target_seg == "churned"   and cust[14] == "churned")
            )
            if not eligible:
                continue
            if random.random() > 0.35:   # 35% enrollment rate
                continue

            enroll_date = rand_date(c_start, min(c_end, c_end))
            contact_ch  = random.choice(["Push Notification", "SMS", "Email", "In-App Banner",
                                         "Outbound Call", "Social Media Ad"])
            accepted    = random.random() < (0.55 if discount > 0 else 0.40)
            conv_date   = enroll_date + timedelta(days=random.randint(1,14)) if accepted else None
            revenue_impact = round(random.uniform(5, 100), 2) if accepted else 0.0

            rows.append((
                eid, camp_id, cid, enroll_date, contact_ch, accepted,
                conv_date, revenue_impact, bonus > 0
            ))
            eid += 1
    return rows

def build_daily_data_usage(customers, plan_map):
    """Sample 90 days × 800 customers for recent granular usage."""
    rows = []
    uid  = 1
    sampled = random.sample(customers, min(800, len(customers)))
    start90  = date(2025, 10, 1)
    plan_idx = {p[0]: i+1 for i, p in enumerate(PLANS)}

    app_categories = ["Social Media", "Video Streaming", "Gaming", "Work/Productivity",
                      "News & Info", "E-Commerce", "Banking", "Navigation", "Other"]

    for cust in sampled:
        cid     = cust[0]
        segment = cust[7]

        for d_offset in range(91):
            usage_date = start90 + timedelta(days=d_offset)
            if usage_date > DATA_END:
                break

            if segment == "youth":    base_mb = random.gauss(350, 150)
            elif segment == "senior": base_mb = random.gauss(80,  60)
            else:                     base_mb = random.gauss(220, 120)

            # weekend spike
            if usage_date.weekday() >= 5:
                base_mb *= 1.35
            is_holiday = usage_date in {date(2025,8,9), date(2025,12,25), date(2025,10,20)}
            if is_holiday:
                base_mb *= 1.5

            total_mb    = max(0, round(base_mb, 2))
            sessions    = max(1, int(random.gauss(5, 3)))
            peak_hour   = random.choices(list(range(24)),
                                         weights=[1,1,1,1,1,2,3,5,6,6,5,5,5,5,6,7,8,9,8,7,6,5,4,2])[0]
            top_app_cat = random.choice(app_categories)
            top_app_mb  = round(total_mb * random.uniform(0.3, 0.6), 2)
            is_4g       = random.random() > 0.35
            network     = "5G" if not is_4g else "4G"
            signal_qual = random.choices(["Excellent","Good","Fair","Poor"],
                                         weights=[40,40,15,5])[0]

            rows.append((uid, cid, usage_date, total_mb, sessions, peak_hour,
                         top_app_cat, top_app_mb, network, signal_qual))
            uid += 1

    return rows

def build_plan_subscriptions(customers):
    """Track plan changes throughout the year."""
    rows = []
    sid = 1
    plan_idx = {p[0]: i+1 for i, p in enumerate(PLANS)}
    for cust in customers:
        cid     = cust[0]
        segment = cust[7]
        # initial subscription at registration
        if segment == "youth":   initial = "youth_unlimited"
        elif segment == "senior":initial = "senior_plus"
        else:                    initial = random.choice(["hiSIM_value","hiSIM_plus","combo_essential"])

        sub_date = cust[13]  # registration date (or Jan 1 if before data start)
        sub_date = max(sub_date, DATA_START)

        current = initial
        rows.append((sid, cid, plan_idx[current], sub_date, None, "new_activation", None))
        sid += 1

        # possible plan changes
        for m in range(1, 13):
            if random.random() < 0.05:
                new_plan = random.choice([p[0] for p in PLANS[:12]])  # exclude tourist
                if new_plan != current:
                    change_date = date(2025, m, random.randint(1, 28))
                    reason = random.choice(["upgrade", "downgrade", "switch_technology",
                                            "promotional_offer", "customer_request"])
                    rows.append((sid, cid, plan_idx[new_plan], change_date, None, reason,
                                 plan_idx[current]))
                    current = new_plan
                    sid += 1
    return rows

def run():
    conn = psycopg2.connect(**DB)
    cur  = conn.cursor()
    print("Connected to telco_lakehouse.")

    # ── drop old tables ────────────────────────────────────────────────────────
    print("Dropping old tables...")
    cur.execute("""
        DROP TABLE IF EXISTS
          fact_daily_data_usage,
          fact_campaign_enrollment,
          fact_churn_prediction,
          fact_recharge_transaction,
          fact_monthly_customer_metrics,
          fact_plan_subscription,
          dim_customer,
          dim_plan,
          dim_channel,
          dim_device,
          dim_location,
          dim_campaign,
          dim_date,
          -- legacy tables
          churn_events, daily_usage, monthly_revenue, recharges, prepaid_plans, customers
        CASCADE;
    """)
    conn.commit()

    # ── dim_date ───────────────────────────────────────────────────────────────
    print("Creating dim_date...")
    cur.execute("""
        CREATE TABLE dim_date (
            calendar_date          DATE PRIMARY KEY,
            year                   SMALLINT,
            month_number           SMALLINT,
            day_of_month           SMALLINT,
            month_name             VARCHAR(12),
            month_short            CHAR(3),
            quarter_number         SMALLINT,
            quarter_label          VARCHAR(10),
            iso_week_number        SMALLINT,
            day_name               VARCHAR(12),
            day_short              CHAR(3),
            is_weekend             BOOLEAN,
            is_singapore_public_holiday BOOLEAN,
            is_non_working_day     BOOLEAN,
            day_sequence_in_dataset INTEGER
        );
    """)
    execute_values(cur, """
        INSERT INTO dim_date VALUES %s
    """, build_dim_date(DATA_START, FUTURE_END))
    conn.commit()
    print(f"  dim_date: {(FUTURE_END - DATA_START).days + 1} rows")

    # ── dim_plan ───────────────────────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE dim_plan (
            plan_id                SERIAL PRIMARY KEY,
            plan_key               VARCHAR(40) UNIQUE NOT NULL,
            plan_name              VARCHAR(100) NOT NULL,
            plan_tier              VARCHAR(20),      -- entry / mid / premium / tourist
            technology             VARCHAR(5),       -- 4G / 5G
            monthly_fee_sgd        NUMERIC(8,2),
            data_allowance_gb      NUMERIC(8,3),     -- 999 = unlimited
            is_unlimited_data      BOOLEAN,
            included_voice_minutes INTEGER,
            included_sms           INTEGER,
            validity_days          SMALLINT,
            is_5g_plan             BOOLEAN,
            target_customer_segment VARCHAR(30),
            overage_rate_sgd_per_gb NUMERIC(6,2) DEFAULT 10.00,
            roaming_enabled        BOOLEAN DEFAULT TRUE,
            is_active_in_catalogue BOOLEAN DEFAULT TRUE
        );
    """)
    execute_values(cur, """
        INSERT INTO dim_plan
          (plan_key,plan_name,plan_tier,technology,monthly_fee_sgd,
           data_allowance_gb,is_unlimited_data,included_voice_minutes,
           included_sms,validity_days,is_5g_plan,target_customer_segment)
        VALUES %s
    """, [(p[0],p[1],p[2],p[3],p[4],
           999 if p[5]==999 else p[5], p[5]==999,
           p[6],p[7],p[8],p[9],p[10]) for p in PLANS])
    conn.commit()

    # ── dim_channel ────────────────────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE dim_channel (
            channel_id             SERIAL PRIMARY KEY,
            channel_key            VARCHAR(40) UNIQUE NOT NULL,
            channel_name           VARCHAR(80) NOT NULL,
            channel_type           VARCHAR(20),  -- retail / direct / partner / marketplace / b2b
            channel_medium         VARCHAR(10),  -- offline / online / mobile / phone
            is_digital             BOOLEAN,
            is_operator_owned       BOOLEAN
        );
    """)
    execute_values(cur, """
        INSERT INTO dim_channel (channel_key,channel_name,channel_type,channel_medium,
                                  is_digital,is_operator_owned) VALUES %s
    """, [(c[0],c[1],c[2],c[3],c[3] in ("online","mobile"),c[2]=="direct") for c in CHANNELS])
    conn.commit()

    # ── dim_device ─────────────────────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE dim_device (
            device_id              SERIAL PRIMARY KEY,
            brand                  VARCHAR(30),
            model_name             VARCHAR(60),
            operating_system       VARCHAR(15),
            device_category        VARCHAR(15),  -- flagship / premium / mid / entry
            is_5g_capable          BOOLEAN,
            release_year           SMALLINT
        );
    """)
    execute_values(cur, """
        INSERT INTO dim_device (brand,model_name,operating_system,device_category,
                                 is_5g_capable,release_year) VALUES %s
    """, [d for d in DEVICES])
    conn.commit()

    # ── dim_location ───────────────────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE dim_location (
            location_id            SERIAL PRIMARY KEY,
            planning_area          VARCHAR(40) NOT NULL,
            region                 VARCHAR(15),  -- Central / North / Northeast / East / West
            is_central_business_district BOOLEAN,
            typical_housing_type   VARCHAR(20)
        );
    """)
    loc_rows = []
    for region, areas in LOCATIONS.items():
        for area in areas:
            is_cbd = area in ["Marina Bay", "Tanjong Pagar", "Orchard"]
            housing = "Mixed Private" if region == "Central" else "Predominantly HDB"
            loc_rows.append((area, region, is_cbd, housing))
    execute_values(cur, """
        INSERT INTO dim_location (planning_area,region,is_central_business_district,
                                   typical_housing_type) VALUES %s
    """, loc_rows)
    conn.commit()

    # ── dim_campaign ───────────────────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE dim_campaign (
            campaign_id            SERIAL PRIMARY KEY,
            campaign_key           VARCHAR(40) UNIQUE NOT NULL,
            campaign_name          VARCHAR(100) NOT NULL,
            campaign_type          VARCHAR(20),  -- seasonal/segment/product/loyalty/retention/referral
            campaign_start_date    DATE,
            campaign_end_date      DATE,
            target_customer_segment VARCHAR(30),
            offer_description      TEXT,
            discount_percentage    SMALLINT DEFAULT 0,
            data_bonus_gb          SMALLINT DEFAULT 0,
            expected_reach         INTEGER,
            estimated_cost_sgd     NUMERIC(10,2)
        );
    """)
    camp_rows = [(c[0],c[1],c[2],c[3],c[4],c[5],c[6],c[7],c[8],
                  random.randint(500,5000), round(random.uniform(5000,80000),2))
                 for c in CAMPAIGNS]
    execute_values(cur, """
        INSERT INTO dim_campaign
          (campaign_key,campaign_name,campaign_type,campaign_start_date,
           campaign_end_date,target_customer_segment,offer_description,
           discount_percentage,data_bonus_gb,expected_reach,estimated_cost_sgd)
        VALUES %s
    """, camp_rows)
    conn.commit()

    # ── dim_customer ───────────────────────────────────────────────────────────
    print("Building dim_customer...")
    cur.execute("""
        CREATE TABLE dim_customer (
            customer_id                SERIAL PRIMARY KEY,
            mobile_number              VARCHAR(15) UNIQUE NOT NULL,
            first_name                 VARCHAR(50),
            gender                     VARCHAR(10),
            ethnicity                  VARCHAR(20),
            age_years                  SMALLINT,
            age_band                   VARCHAR(10),
            customer_segment           VARCHAR(20),  -- youth/young_adult/adult/senior
            region                     VARCHAR(15),
            planning_area              VARCHAR(40),
            postal_code                CHAR(6),
            housing_type               VARCHAR(20),
            tenure_years               NUMERIC(5,1),
            registration_date          DATE,
            account_status             VARCHAR(15),  -- active / churned / suspended
            net_promoter_score         SMALLINT,     -- 0-10 NPS
            estimated_lifetime_value_sgd NUMERIC(10,2),
            preferred_contact_channel  VARCHAR(40)
        );
    """)
    print("  Generating customers...")
    customers = build_customers(N_CUSTOMERS)
    execute_values(cur, """
        INSERT INTO dim_customer VALUES %s
    """, customers)
    conn.commit()
    print(f"  dim_customer: {len(customers)} rows")

    plan_map = {p[0]: i+1 for i, p in enumerate(PLANS)}

    # ── fact_plan_subscription ─────────────────────────────────────────────────
    print("Building fact_plan_subscription...")
    cur.execute("""
        CREATE TABLE fact_plan_subscription (
            subscription_id        SERIAL PRIMARY KEY,
            customer_id            INTEGER REFERENCES dim_customer(customer_id),
            plan_id                INTEGER REFERENCES dim_plan(plan_id),
            effective_date         DATE,
            end_date               DATE,
            change_reason          VARCHAR(40),
            previous_plan_id       INTEGER
        );
    """)
    subs = build_plan_subscriptions(customers)
    execute_values(cur, """
        INSERT INTO fact_plan_subscription
          (subscription_id,customer_id,plan_id,effective_date,end_date,
           change_reason,previous_plan_id) VALUES %s
    """, subs)
    conn.commit()
    print(f"  fact_plan_subscription: {len(subs)} rows")

    # ── fact_monthly_customer_metrics ─────────────────────────────────────────
    print("Building fact_monthly_customer_metrics (this takes a moment)...")
    cur.execute("""
        CREATE TABLE fact_monthly_customer_metrics (
            metric_id                      SERIAL PRIMARY KEY,
            customer_id                    INTEGER REFERENCES dim_customer(customer_id),
            plan_id                        INTEGER REFERENCES dim_plan(plan_id),
            next_month_plan_id             INTEGER,
            month_start_date               DATE,
            month_number                   SMALLINT,
            year                           SMALLINT,
            -- Data usage
            data_used_mb                   NUMERIC(12,2),
            data_allowance_mb              NUMERIC(12,2),
            data_utilisation_pct           NUMERIC(5,2) GENERATED ALWAYS AS
                                             (ROUND(data_used_mb / NULLIF(data_allowance_mb,0) * 100, 2)) STORED,
            data_overage_gb                NUMERIC(8,3),
            -- Voice & SMS
            voice_minutes_used             INTEGER,
            sms_sent                       INTEGER,
            international_call_minutes     INTEGER,
            roaming_data_used_mb           INTEGER,
            -- Revenue (SGD)
            base_plan_revenue_sgd          NUMERIC(8,2),
            overage_revenue_sgd            NUMERIC(8,2),
            roaming_revenue_sgd            NUMERIC(8,2),
            international_call_revenue_sgd NUMERIC(8,2),
            total_monthly_revenue_sgd      NUMERIC(8,2),
            -- Recharge behaviour
            recharge_count                 SMALLINT,
            total_recharged_sgd            NUMERIC(8,2),
            -- Engagement
            avg_daily_data_sessions        NUMERIC(5,1),
            avg_session_duration_minutes   NUMERIC(5,1),
            my_operator_app_launches        INTEGER,
            -- Risk indicators
            days_since_last_recharge       SMALLINT,
            customer_support_contacts      SMALLINT,
            had_complaint_this_month       BOOLEAN,
            competitor_inquiry_detected    BOOLEAN,
            -- Plan dynamics
            plan_changed_this_month        BOOLEAN,
            customer_churned_this_month    BOOLEAN
        );
    """)
    metrics = build_monthly_customer_metrics(customers, plan_map, None)
    execute_values(cur, """
        INSERT INTO fact_monthly_customer_metrics
          (customer_id,plan_id,next_month_plan_id,month_start_date,month_number,year,
           data_used_mb,data_allowance_mb,data_overage_gb,
           voice_minutes_used,sms_sent,international_call_minutes,roaming_data_used_mb,
           base_plan_revenue_sgd,overage_revenue_sgd,roaming_revenue_sgd,
           international_call_revenue_sgd,total_monthly_revenue_sgd,
           recharge_count,total_recharged_sgd,
           avg_daily_data_sessions,avg_session_duration_minutes,my_operator_app_launches,
           days_since_last_recharge,customer_support_contacts,
           had_complaint_this_month,competitor_inquiry_detected,
           plan_changed_this_month,customer_churned_this_month)
        VALUES %s
    """, metrics, page_size=2000)
    conn.commit()
    print(f"  fact_monthly_customer_metrics: {len(metrics)} rows")

    # ── fact_recharge_transaction ──────────────────────────────────────────────
    print("Building fact_recharge_transaction...")
    cur.execute("""
        CREATE TABLE fact_recharge_transaction (
            transaction_id             SERIAL PRIMARY KEY,
            customer_id                INTEGER REFERENCES dim_customer(customer_id),
            transaction_date           DATE,
            recharge_amount_sgd        NUMERIC(8,2),
            payment_method             VARCHAR(30),
            plan_id                    INTEGER REFERENCES dim_plan(plan_id),
            channel_id                 INTEGER REFERENCES dim_channel(channel_id),
            is_auto_renewal            BOOLEAN,
            transaction_status         VARCHAR(10),
            was_failed_retry           BOOLEAN
        );
    """)
    recharges = build_recharge_transactions(customers, plan_map)
    execute_values(cur, """
        INSERT INTO fact_recharge_transaction VALUES %s
    """, recharges, page_size=2000)
    conn.commit()
    print(f"  fact_recharge_transaction: {len(recharges)} rows")

    # ── fact_daily_data_usage ──────────────────────────────────────────────────
    print("Building fact_daily_data_usage (90-day sample)...")
    cur.execute("""
        CREATE TABLE fact_daily_data_usage (
            usage_id                   SERIAL PRIMARY KEY,
            customer_id                INTEGER REFERENCES dim_customer(customer_id),
            usage_date                 DATE,
            total_data_used_mb         NUMERIC(10,2),
            number_of_sessions         SMALLINT,
            peak_usage_hour            SMALLINT,       -- 0-23 (24h)
            top_app_category           VARCHAR(30),
            top_app_data_used_mb       NUMERIC(10,2),
            network_technology         VARCHAR(5),     -- 4G / 5G
            signal_quality             VARCHAR(10)     -- Excellent/Good/Fair/Poor
        );
    """)
    daily = build_daily_data_usage(customers, plan_map)
    execute_values(cur, """
        INSERT INTO fact_daily_data_usage VALUES %s
    """, daily, page_size=2000)
    conn.commit()
    print(f"  fact_daily_data_usage: {len(daily)} rows")

    # ── fact_churn_prediction ──────────────────────────────────────────────────
    print("Building fact_churn_prediction...")
    cur.execute("""
        CREATE TABLE fact_churn_prediction (
            prediction_id              SERIAL PRIMARY KEY,
            customer_id                INTEGER REFERENCES dim_customer(customer_id),
            prediction_month_date      DATE,
            prediction_month_label     VARCHAR(15),
            churn_probability_score    NUMERIC(5,4),   -- 0.0000 to 1.0000
            churn_risk_band            VARCHAR(10),    -- low/medium/high/critical
            top_churn_driver           TEXT,
            recommended_retention_action TEXT,
            is_future_prediction       BOOLEAN,        -- TRUE = not yet occurred
            actual_customer_churned    BOOLEAN,        -- NULL if future
            model_version              VARCHAR(20)
        );
    """)
    predictions = build_churn_predictions(customers)
    execute_values(cur, """
        INSERT INTO fact_churn_prediction VALUES %s
    """, predictions, page_size=2000)
    conn.commit()
    print(f"  fact_churn_prediction: {len(predictions)} rows")

    # ── fact_campaign_enrollment ───────────────────────────────────────────────
    print("Building fact_campaign_enrollment...")
    cur.execute("""
        CREATE TABLE fact_campaign_enrollment (
            enrollment_id              SERIAL PRIMARY KEY,
            campaign_id                INTEGER REFERENCES dim_campaign(campaign_id),
            customer_id                INTEGER REFERENCES dim_customer(customer_id),
            enrollment_date            DATE,
            contact_channel            VARCHAR(30),
            customer_accepted_offer    BOOLEAN,
            conversion_date            DATE,
            incremental_revenue_sgd    NUMERIC(8,2),
            data_bonus_activated       BOOLEAN
        );
    """)
    enrollments = build_campaign_enrollments(customers, None)
    execute_values(cur, """
        INSERT INTO fact_campaign_enrollment VALUES %s
    """, enrollments, page_size=2000)
    conn.commit()
    print(f"  fact_campaign_enrollment: {len(enrollments)} rows")

    # ── grant SELECT to rendara ────────────────────────────────────────────────
    cur.execute("""
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO rendara;
    """)
    conn.commit()

    # ── summary ───────────────────────────────────────────────────────────────
    cur.execute("""
        SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """)
    print("\n── Schema Summary ────────────────────────────────────────────────────")
    for row in cur.fetchall():
        print(f"  {row[0]:<45} {row[1]}")

    cur.close()
    conn.close()
    print("\nDone. Demo prepaid data warehouse is ready.")

if __name__ == "__main__":
    run()
