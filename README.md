# Shift-Scraper

This is an Azure Function App which runs a function on a timer to scrape a local shift sign-up system and send emails with shifts as they are made available.

The Azure Function makes an authentication request to the site, then scrapes the next N months of shifts and compares it to the previously scraped shifts. If new shifts are found, they are sent via email using SendGrid. Then the current shifts are stored in Azure Blob Storage