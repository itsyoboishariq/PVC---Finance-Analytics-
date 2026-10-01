export function exportToJson(data, filename = 'financial_model.json') {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportFinancialTableToCsv(monthlyResults, periods, filename = 'financial_model_output.csv') {
  if (!monthlyResults || monthlyResults.length === 0) return;

  const headers = ['Line Item', 'Source / Cell', ...monthlyResults.map(m => m.label), 'Total / Summary'];
  const rows = [];

  const addRow = (name, cellRef, key, isTotal = false) => {
    const vals = monthlyResults.map(m => m[key]);
    let totalVal = '';
    if (typeof vals[0] === 'number') {
      const sum = vals.reduce((a, b) => a + b, 0);
      totalVal = sum.toFixed(2);
    }
    rows.push([`"${name}"`, `"${cellRef}"`, ...vals, totalVal]);
  };

  // Funnel
  addRow('Leads Generated', 'Row 20', 'leads_generated');
  addRow('Lead to Trial %', 'Row 21', 'lead_to_trial_conversion');
  addRow('Trials Started', 'Row 22', 'trials_started');
  addRow('Trial to Paid %', 'Row 23', 'trial_to_paid_conversion');
  addRow('New Paid Customers', 'Row 24', 'new_paid_customers');

  // Customer Waterfall
  addRow('Beginning Active Customers', 'Row 25', 'beginning_active_customers');
  addRow('Monthly Churn Rate', 'Row 26', 'monthly_churn_rate');
  addRow('(-) Churned Customers', 'Row 27', 'churned_customers');
  addRow('Ending Active Customers', 'Row 28', 'ending_active_customers');

  // Customer Breakdown
  addRow('Trial Tier Customers', 'Row 29', 'trial_tier_customers');
  addRow('Pro Tier Customers', 'Row 30', 'pro_tier_customers');
  addRow('Enterprise Tier Customers', 'Row 31', 'enterprise_tier_customers');

  // Revenue
  addRow('Basic Plan Revenue ($)', 'Row 32', 'basic_plan_revenue');
  addRow('Pro Plan Revenue ($)', 'Row 33', 'pro_plan_revenue');
  addRow('Enterprise Plan Revenue ($)', 'Row 34', 'enterprise_plan_revenue');
  addRow('Total MRR ($)', 'Row 35', 'total_mrr', true);

  // COGS
  addRow('Cloud Hosting ($)', 'Row 37', 'cloud_hosting');
  addRow('Payment Processing ($)', 'Row 38', 'payment_processing');
  addRow('Third-Party APIs ($)', 'Row 39', 'third_party_apis');
  addRow('Other Direct Costs ($)', 'Row 40', 'other_direct_costs');
  addRow('Total COGS ($)', 'Row 41', 'total_cogs', true);

  // OPEX & EBIT
  addRow('Total OPEX ($)', 'Row 53', 'total_opex', true);
  addRow('EBIT ($)', 'Row 56', 'ebit', true);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportLeadsToCsv(leadsList, filename = 'workbook_leads.csv') {
  if (!leadsList || leadsList.length === 0) return;
  const headers = ['Row', 'Customer Name', 'Date Found', 'Primary Contact', 'Summary', 'Converted', 'Contract Amount ($)'];
  const rows = leadsList.map(l => [
    l.row,
    `"${l.customer_name.replace(/"/g, '""')}"`,
    `"${l.date_found}"`,
    `"${(l.primary_contact || '').replace(/"/g, '""')}"`,
    `"${(l.summary || '').replace(/"/g, '""')}"`,
    `"${l.customer_converted}"`,
    l.contract_amount_yearly
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
