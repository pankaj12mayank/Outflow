"""
Outflo - CSV Import System
Drag/drop upload, mapping, deduplication, validation
"""

import csv
import io
import re
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

from .base import ScrapeResult, ScrapeSource


@dataclass
class CSVColumn:
    """Column definition for CSV mapping"""
    name: str
    sample_values: List[str]
    detected_type: str  # email, phone, name, url, address, etc.
    confidence: float


@dataclass
class ColumnMapping:
    """Mapping from CSV columns to lead fields"""
    csv_column: str
    lead_field: str
    transformer: Optional[str] = None  # phone_format, email_lower, etc.


class CSVImporter:
    """
    CSV Import System with smart column detection and mapping
    
    Features:
    - Drag and drop upload
    - Automatic column type detection
    - Smart field mapping suggestions
    - Deduplication
    - Validation
    - Error handling
    """
    
    # Field type patterns
    EMAIL_PATTERN = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
    PHONE_PATTERN = re.compile(r'\+?[\d\s\-\(\)]{10,}')
    URL_PATTERN = re.compile(r'https?://[^\s]+')
    
    # Standard field names for mapping
    STANDARD_FIELDS = {
        "email": ["email", "e-mail", "email_address", "emailaddress", "mail"],
        "phone": ["phone", "telephone", "tel", "phone_number", "phonenumber", "mobile", "cell"],
        "name": ["name", "full_name", "fullname", "contact_name", "contact"],
        "first_name": ["first_name", "firstname", "first name", "fname"],
        "last_name": ["last_name", "lastname", "last name", "lname"],
        "company": ["company", "company_name", "companyname", "organization", "org"],
        "website": ["website", "url", "web", "site", "domain"],
        "address": ["address", "street", "location"],
        "city": ["city", "town"],
        "state": ["state", "province", "region"],
        "country": ["country"],
        "postal_code": ["postal_code", "zip", "zipcode", "postal", "postcode"],
        "linkedin_url": ["linkedin", "linkedin_url", "linkedin_url"],
        "job_title": ["title", "job_title", "position", "role"],
    }
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
    
    async def parse_file(self, content: bytes, filename: str) -> Dict[str, Any]:
        """
        Parse CSV file and return structure info
        
        Args:
            content: Raw CSV file bytes
            filename: Original filename
            
        Returns:
            Dict with columns info and sample data
        """
        try:
            # Decode content
            text = content.decode('utf-8', errors='ignore')
            
            # Parse CSV
            reader = csv.DictReader(io.StringIO(text))
            headers = reader.fieldnames or []
            
            # Get first few rows for analysis
            rows = []
            for i, row in enumerate(reader):
                if i >= 5:
                    break
                rows.append(row)
            
            # Analyze columns
            columns = []
            for header in headers:
                samples = [row.get(header, '') for row in rows if row.get(header)]
                detected_type = self._detect_column_type(samples)
                confidence = self._calculate_type_confidence(samples, detected_type)
                
                columns.append(CSVColumn(
                    name=header,
                    sample_values=samples[:3],
                    detected_type=detected_type,
                    confidence=confidence
                ))
            
            return {
                "success": True,
                "filename": filename,
                "total_rows": text.count('\n'),
                "columns": [
                    {
                        "name": c.name,
                        "sample_values": c.sample_values,
                        "detected_type": c.detected_type,
                        "confidence": c.confidence,
                        "suggested_mapping": self._suggest_mapping(c),
                    }
                    for c in columns
                ],
            }
            
        except Exception as e:
            self.logger.error(f"Error parsing CSV: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def import_data(
        self,
        content: bytes,
        mapping: List[ColumnMapping],
        options: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Import CSV data with mapping
        
        Args:
            content: Raw CSV bytes
            mapping: Column mappings
            options: Import options (skip_duplicates, etc.)
            
        Returns:
            Import results with leads and errors
        """
        try:
            text = content.decode('utf-8', errors='ignore')
            reader = csv.DictReader(io.StringIO(text))
            
            leads = []
            errors = []
            seen_emails = set()
            
            for i, row in enumerate(reader, start=2):  # Start at 2 (1 for header)
                try:
                    lead_data = self._map_row(row, mapping)
                    
                    # Validation
                    validation = self._validate_lead(lead_data)
                    if not validation["valid"]:
                        errors.append({
                            "row": i,
                            "errors": validation["errors"]
                        })
                        continue
                    
                    # Deduplication
                    if options.get("skip_duplicates", True):
                        email = lead_data.get("email", "").lower()
                        if email and email in seen_emails:
                            continue
                        seen_emails.add(email)
                    
                    # Create ScrapeResult
                    result = ScrapeResult(
                        success=True,
                        source=ScrapeSource.CSV,
                        business_name=lead_data.get("company"),
                        email=lead_data.get("email"),
                        phone=lead_data.get("phone"),
                        address=lead_data.get("address"),
                        city=lead_data.get("city"),
                        state=lead_data.get("state"),
                        country=lead_data.get("country"),
                        postal_code=lead_data.get("postal_code"),
                        website=lead_data.get("website"),
                        linkedin_url=lead_data.get("linkedin_url"),
                    )
                    result.raw_data["import_row"] = i
                    result.raw_data["imported_fields"] = lead_data
                    
                    leads.append(result)
                    
                except Exception as e:
                    errors.append({
                        "row": i,
                        "errors": [str(e)]
                    })
            
            return {
                "success": True,
                "total_rows": text.count('\n') - 1,
                "imported": len(leads),
                "skipped": len(errors),
                "leads": leads,
                "errors": errors[:100],  # Limit error reporting
            }
            
        except Exception as e:
            self.logger.error(f"Error importing CSV: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def preview_data(
        self,
        content: bytes,
        mapping: List[ColumnMapping],
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Preview mapped data without full import"""
        text = content.decode('utf-8', errors='ignore')
        reader = csv.DictReader(io.StringIO(text))
        
        previews = []
        for i, row in enumerate(reader):
            if i >= limit:
                break
            previews.append(self._map_row(row, mapping))
        
        return previews
    
    def _detect_column_type(self, samples: List[str]) -> str:
        """Detect column type from sample values"""
        if not samples:
            return "unknown"
        
        non_empty = [s for s in samples if s.strip()]
        if not non_empty:
            return "empty"
        
        # Check each sample for patterns
        email_count = sum(1 for s in non_empty if self.EMAIL_PATTERN.match(s.strip()))
        phone_count = sum(1 for s in non_empty if self.PHONE_PATTERN.search(s.strip()))
        url_count = sum(1 for s in non_empty if self.URL_PATTERN.match(s.strip()))
        
        total = len(non_empty)
        
        if email_count / total > 0.7:
            return "email"
        if phone_count / total > 0.7:
            return "phone"
        if url_count / total > 0.7:
            return "url"
        
        return "text"
    
    def _calculate_type_confidence(self, samples: List[str], detected_type: str) -> float:
        """Calculate confidence score for type detection"""
        if not samples or detected_type in ["unknown", "empty"]:
            return 0.0
        
        non_empty = [s for s in samples if s.strip()]
        if not non_empty:
            return 0.0
        
        total = len(non_empty)
        
        if detected_type == "email":
            matches = sum(1 for s in non_empty if self.EMAIL_PATTERN.match(s.strip()))
        elif detected_type == "phone":
            matches = sum(1 for s in non_empty if self.PHONE_PATTERN.search(s.strip()))
        elif detected_type == "url":
            matches = sum(1 for s in non_empty if self.URL_PATTERN.match(s.strip()))
        else:
            return 0.5
        
        return matches / total
    
    def _suggest_mapping(self, column: CSVColumn) -> Optional[str]:
        """Suggest field mapping based on column name"""
        name_lower = column.name.lower().replace(' ', '_').replace('-', '_')
        
        for field, aliases in self.STANDARD_FIELDS.items():
            for alias in aliases:
                if alias in name_lower:
                    return field
        
        # Also consider detected type
        if column.detected_type == "email" and not any(a in name_lower for a in self.STANDARD_FIELDS["email"]):
            return "email"
        if column.detected_type == "phone" and not any(a in name_lower for a in self.STANDARD_FIELDS["phone"]):
            return "phone"
        
        return None
    
    def _map_row(self, row: Dict[str, str], mapping: List[ColumnMapping]) -> Dict[str, str]:
        """Map CSV row to lead data using mapping"""
        result = {}
        
        for m in mapping:
            value = row.get(m.csv_column, '').strip()
            
            # Apply transformers
            if m.transformer:
                value = self._apply_transform(value, m.transformer)
            
            result[m.lead_field] = value
        
        return result
    
    def _apply_transform(self, value: str, transformer: str) -> str:
        """Apply value transformation"""
        if not value:
            return value
        
        if transformer == "phone_format":
            # Clean and format phone
            digits = re.sub(r'\D', '', value)
            if len(digits) == 10:
                return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
            elif len(digits) == 11 and digits[0] == '1':
                return f"+1 ({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
        
        elif transformer == "email_lower":
            return value.lower().strip()
        
        elif transformer == "name_title":
            return value.title().strip()
        
        return value
    
    def _validate_lead(self, lead_data: Dict[str, str]) -> Dict[str, Any]:
        """Validate lead data"""
        errors = []
        
        # Must have email or phone
        if not lead_data.get("email") and not lead_data.get("phone"):
            errors.append("Must have at least email or phone")
        
        # Validate email format
        email = lead_data.get("email")
        if email and not self.EMAIL_PATTERN.match(email):
            errors.append("Invalid email format")
        
        # Validate phone format
        phone = lead_data.get("phone")
        if phone and len(re.sub(r'\D', '', phone)) < 10:
            errors.append("Invalid phone format")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }


import logging