from backend.parsers.bca_parser import BCAParser
from backend.parsers.categorizer import IndonesianCategorizer

def test_user_exact_bca_email():
    raw_email = """
Hello JONATHAN ADRIANUS GANI,
You just made a transaction through myBCA.
Here are the details of your transaction :

Status : Successful
Transaction Date : 30 Aug 2026 18:24:28
Transaction Type : QRIS Payment
Payment to : ESB Restaurant Tech D
Merchant Location : TANGERANG, 15810, ID
Acquirer : BCA
Merchant PAN : 9360001430026573904
Terminal ID : A0000001
Source of Fund : TAHAPAN - 6720****92
Customer PAN : 9360001410092502649
Total Payment : IDR 45,320.00
RRN : 287921937
Reference No. : 9527120260830182424533QRS1079342240
Please save this email as your transaction reference.
If you do not recognize this transaction, immediately contact Halo BCA at 1500888.

Best Regards,
PT Bank Central Asia Tbk
"""

    parsed = BCAParser.parse_email_content(raw_email)
    print("Parsed Result:", parsed)

    assert parsed is not None
    assert parsed["status"] == "Successful"
    assert parsed["transaction_date"] == "2026-08-30 18:24:28"
    assert parsed["transaction_type"] == "QRIS Payment"
    assert parsed["merchant_name"] == "ESB Restaurant Tech D"
    assert parsed["merchant_location"] == "TANGERANG, 15810, ID"
    assert parsed["source_of_fund"] == "TAHAPAN - 6720****92"
    assert parsed["amount"] == 45320.0
    assert parsed["currency"] == "IDR"
    assert parsed["rrn"] == "287921937"
    assert parsed["reference_no"] == "9527120260830182424533QRS1079342240"
    assert parsed["customer_name"] == "JONATHAN ADRIANUS GANI"

    # Test Categorizer
    category, subcat, entity = IndonesianCategorizer.classify(parsed["merchant_name"], parsed["transaction_type"])
    print(f"Categorized: {category} -> {subcat} [{entity}]")
    assert category == "Food & Dining"
    assert entity == "Personal"
    print("[SUCCESS] All assertions passed for user's BCA QRIS email!")

if __name__ == "__main__":
    test_user_exact_bca_email()
