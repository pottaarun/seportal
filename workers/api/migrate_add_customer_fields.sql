-- Add customer_name and sfdc_link fields to opportunities table
ALTER TABLE feature_request_opportunities ADD COLUMN customer_name TEXT;
ALTER TABLE feature_request_opportunities ADD COLUMN sfdc_link TEXT;
