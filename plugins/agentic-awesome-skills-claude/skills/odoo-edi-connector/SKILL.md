---
name: odoo-edi-connector
description: "Guide for implementing EDI (Electronic Data Interchange) with Odoo: X12, EDIFACT document mapping, partner onboarding, and automated order processing."
risk: unknown
source: community
---

# Odoo EDI Connector

## Overview

Electronic Data Interchange (EDI) is the standard for automated B2B document exchange — purchase orders, invoices, ASNs (Advance Shipping Notices). This skill guides you through mapping EDI transactions (ANSI X12 or EDIFACT) to Odoo business objects, setting up trading partner configurations, and automating inbound/outbound document flows.

## When to Use This Skill

- A retail partner requires EDI 850 (Purchase Orders) to do business with you.
- You need to send EDI 856 (ASN) when goods are shipped.
- Automating EDI 810 (Invoice) generation from Odoo confirmed deliveries.
- Mapping EDI fields to Odoo fields for a new trading partner.

## How It Works

1. **Activate**: Mention `@odoo-edi-connector` and specify the EDI transaction set and trading partner.
2. **Map**: Receive a complete field mapping table between EDI segments and Odoo fields.
3. **Automate**: Get Python code to parse incoming EDI files and create Odoo records.

## EDI ↔ Odoo Object Mapping

| EDI Transaction | Odoo Object |
|---|---|
| 850 Purchase Order | `sale.order` (inbound customer PO) |
| 855 PO Acknowledgment | Confirmation email / SO confirmation |
| 856 ASN (Advance Ship Notice) | `stock.picking` (delivery order) |
| 810 Invoice | `account.move` (customer invoice) |
| 846 Inventory Inquiry | `product.product` stock levels |
| 997 Functional Acknowledgment | Automated receipt confirmation |

## Examples

### Example 1: Parse EDI 850 and Create Odoo Sale Order (Python)

```python
from pyx12 import x12file  # pip install pyx12
from datetime import datetime

import xmlrpc.client
import os

odoo_url = os.getenv("ODOO_URL")
db = os.getenv("ODOO_DB")
pwd = os.getenv("ODOO_API_KEY") 
uid = int(os.getenv("ODOO_UID", "2"))

models = xmlrpc.client.ServerProxy(f"{odoo_url}/xmlrpc/2/object")

def process_850(edi_file_path):
    """Parse X12 850 Purchase Order and create Odoo Sale Order"""
    with x12file.X12File(edi_file_path) as f:
        for transaction in f.get_transaction_sets():
            # Extract header info (BEG segment)                     
            po_number = transaction['BEG'][3]    # Purchase Order Number                                                    
            po_date   = transaction['BEG'][5]    # Purchase Order Date 

            # IDEMPOTENCY CHECK: Verify PO doesn't already exist in Odoo
            existing = models.execute_kw(db, uid, pwd, 'sale.order', 'search', [
                [['client_order_ref', '=', po_number]]
            ])
            if existing:
                print(f"Skipping: PO {po_number} already exists.")
                continue 

            # Extract partner (N1 segment — Buyer)


                        # Extract partner (N1 segment — Buyer)                  
            partner_name = transaction.get_segment('N1')[2] if transaction.get_segment('N1') else "Unknown"                                                                             
            
            # Find partner in Odoo                                  
            partner = models.execute_kw(db, uid, pwd, 'res.partner', 'search',                                                  
                                [[['name', 'ilike', partner_name]]])                
            
            if not partner:
                print(f"Error: Partner '{partner_name}' not found. Skipping transaction.")
                continue
                
            partner_id = partner[0]

            # Extract line items (PO1 segments)
            order_lines = []
            for po1 in transaction.get_segments('PO1'):
                sku     = po1[7]    # Product ID
                qty     = float(po1[2])
                price   = float(po1[4])

                product = models.execute_kw(db, uid, pwd, 'product.product', 'search',
                    [[['default_code', '=', sku]]])
                if product:
                    order_lines.append((0, 0, {
                        'product_id': product[0],
                        'product_uom_qty': qty,
                        'price_unit': price,
                    }))

            # Create Sale Order
            if partner_id and order_lines:
                models.execute_kw(db, uid, pwd, 'sale.order', 'create', [{
                    'partner_id': partner_id,
                    'client_order_ref': po_number,
                    'order_line': order_lines,
                }])
```

### Example 2: Send EDI 997 Acknowledgment

```python
def generate_997(isa_control, gs_control, transaction_control):
    """Generate a functional acknowledgment for received EDI"""
    today = datetime.now().strftime('%y%m%d')
    return f"""ISA*00*          *00*          *ZZ*YOURISAID      *ZZ*PARTNERISAID   *{today}*1200*^*00501*{isa_control}*0*P*>~
GS*FA*YOURGID*PARTNERGID*{today}*1200*{gs_control}*X*005010X231A1~
ST*997*0001~
AK1*PO*{gs_control}~
AK9*A*1*1*1~
SE*4*0001~
GE*1*{gs_control}~
IEA*1*{isa_control}~"""
```

## Best Practices

- ✅ **Do:** Store every raw EDI transaction in an audit log table before processing.
- ✅ **Do:** Always send a **997 Functional Acknowledgment** within 24 hours of receiving a transaction.
- ✅ **Do:** Negotiate a test cycle with trading partners before going live — use test ISA qualifier `T`.
- ❌ **Don't:** Process EDI files synchronously in web requests — queue them for async processing.
- ❌ **Don't:** Hardcode trading partner qualifiers — store them in a configuration table per partner.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
