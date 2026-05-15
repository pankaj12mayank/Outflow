import pytest
from app.core.validation import (
    validate_email, validate_url, validate_linkedin_url, validate_phone,
    validate_lead_data, validate_campaign_data, validate_scraping_url,
    validate_csv_content, validate_email_content, validate_sequence_steps,
    validate_bulk_operation,
)


@pytest.mark.unit
class TestEmailValidation:
    def test_valid_emails(self):
        assert validate_email("user@example.com")
        assert validate_email("test.user@domain.co.uk")
        assert validate_email("user+tag@example.com")

    def test_invalid_emails(self):
        assert not validate_email("invalid")
        assert not validate_email("@example.com")
        assert not validate_email("user@")
        assert not validate_email("user space@example.com")


@pytest.mark.unit
class TestURLValidation:
    def test_valid_urls(self):
        assert validate_url("https://example.com")
        assert validate_url("http://sub.domain.com/path")
        assert validate_url("https://example.com/path?query=value")

    def test_invalid_urls(self):
        assert not validate_url("not a url")
        assert not validate_url("ftp://example.com")
        assert not validate_url("example.com")


@pytest.mark.unit
class TestLinkedInValidation:
    def test_valid_linkedin_urls(self):
        assert validate_linkedin_url("https://linkedin.com/in/johndoe")
        assert validate_linkedin_url("https://www.linkedin.com/company/acme")

    def test_invalid_linkedin_urls(self):
        assert not validate_linkedin_url("https://twitter.com/in/johndoe")
        assert not validate_linkedin_url("https://example.com/in/johndoe")


@pytest.mark.unit
class TestPhoneValidation:
    def test_valid_phones(self):
        assert validate_phone("+1234567890")
        assert validate_phone("1234567890")
        assert validate_phone("+44 20 7946 0958")

    def test_invalid_phones(self):
        assert not validate_phone("123")
        assert not validate_phone("abc123def")


@pytest.mark.unit
class TestLeadValidation:
    def test_valid_lead(self):
        valid, errors = validate_lead_data({
            "email": "test@example.com",
            "first_name": "John",
            "website": "https://example.com",
        })
        assert valid
        assert len(errors) == 0

    def test_invalid_email_lead(self):
        valid, errors = validate_lead_data({"email": "invalid-email"})
        assert not valid
        assert any("email" in e.lower() for e in errors)

    def test_invalid_phone_lead(self):
        valid, errors = validate_lead_data({
            "email": "test@example.com",
            "phone": "123",
        })
        assert not valid

    def test_invalid_website_lead(self):
        valid, errors = validate_lead_data({
            "email": "test@example.com",
            "website": "not-a-url",
        })
        assert not valid

    def test_long_name_lead(self):
        valid, errors = validate_lead_data({
            "email": "test@example.com",
            "first_name": "A" * 150,
        })
        assert not valid


@pytest.mark.unit
class TestCampaignValidation:
    def test_valid_campaign(self):
        valid, errors = validate_campaign_data({
            "name": "Test Campaign",
            "target_leads": 100,
        })
        assert valid

    def test_short_name_campaign(self):
        valid, errors = validate_campaign_data({"name": "A"})
        assert not valid

    def test_negative_target_leads(self):
        valid, errors = validate_campaign_data({"name": "Test", "target_leads": -1})
        assert not valid

    def test_end_before_start_date(self):
        from datetime import datetime, timedelta
        valid, errors = validate_campaign_data({
            "name": "Test",
            "start_date": datetime.utcnow().isoformat(),
            "end_date": (datetime.utcnow() - timedelta(days=1)).isoformat(),
        })
        assert not valid


@pytest.mark.unit
class TestScrapingURLValidation:
    def test_blocked_facebook(self):
        valid, error = validate_scraping_url("https://facebook.com/page")
        assert not valid
        assert "not allowed" in error

    def test_blocked_twitter(self):
        valid, error = validate_scraping_url("https://twitter.com/user")
        assert not valid

    def test_blocked_login_path(self):
        valid, error = validate_scraping_url("https://example.com/login")
        assert not valid
        assert "restricted" in error

    def test_valid_url(self):
        valid, error = validate_scraping_url("https://example.com/about")
        assert valid
        assert error is None


@pytest.mark.unit
class TestCSVValidation:
    def test_valid_csv(self):
        content = b"email,name\ntest@example.com,Test\nuser@example.com,User"
        valid, error = validate_csv_content(content)
        assert valid

    def test_empty_csv(self):
        valid, error = validate_csv_content(b"")
        assert not valid

    def test_too_large_csv(self):
        content = b"a" * (11 * 1024 * 1024)
        valid, error = validate_csv_content(content)
        assert not valid
        assert "large" in error.lower()

    def test_no_header(self):
        content = b"test@example.com,Test"
        valid, error = validate_csv_content(content)
        assert not valid


@pytest.mark.unit
class TestEmailContentValidation:
    def test_valid_email(self):
        valid, errors = validate_email_content(
            "Test Subject",
            "Hello, this is a test email body.",
        )
        assert valid

    def test_empty_subject(self):
        valid, errors = validate_email_content("", "Body")
        assert not valid

    def test_spam_indicators(self):
        valid, errors = validate_email_content(
            "Act Now",
            "Click here now for free money!",
        )
        assert not valid

    def test_too_long_body(self):
        valid, errors = validate_email_content(
            "Test",
            "A" * 60000,
        )
        assert not valid


@pytest.mark.unit
class TestSequenceValidation:
    def test_valid_sequence(self):
        valid, errors = validate_sequence_steps([
            {"type": "email", "subject": "Hello", "body": "Hi"},
            {"type": "delay", "delay_hours": 24},
        ])
        assert valid

    def test_empty_sequence(self):
        valid, errors = validate_sequence_steps([])
        assert not valid

    def test_email_missing_subject(self):
        valid, errors = validate_sequence_steps([
            {"type": "email", "body": "Hi"},
        ])
        assert not valid

    def test_delay_too_short(self):
        valid, errors = validate_sequence_steps([
            {"type": "delay", "delay_hours": 0},
        ])
        assert not valid

    def test_delay_too_long(self):
        valid, errors = validate_sequence_steps([
            {"type": "delay", "delay_hours": 800},
        ])
        assert not valid

    def test_invalid_step_type(self):
        valid, errors = validate_sequence_steps([
            {"type": "invalid_type"},
        ])
        assert not valid


@pytest.mark.unit
class TestBulkOperationValidation:
    def test_valid_bulk(self):
        valid, error = validate_bulk_operation([1, 2, 3, 4, 5])
        assert valid

    def test_empty_bulk(self):
        valid, error = validate_bulk_operation([])
        assert not valid

    def test_too_many_items(self):
        ids = list(range(1001))
        valid, error = validate_bulk_operation(ids)
        assert not valid

    def test_duplicate_ids(self):
        valid, error = validate_bulk_operation([1, 2, 2, 3])
        assert not valid

    def test_invalid_id(self):
        valid, error = validate_bulk_operation([0, 1, 2])
        assert not valid