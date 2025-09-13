-- Quotes table stores top-level quote information.
CREATE TABLE Quotes (
  quoteId SERIAL PRIMARY KEY,
  customerName TEXT NOT NULL,
  customerEmail TEXT NOT NULL,
  customerPhone TEXT,
  sourceLanguage TEXT NOT NULL,
  targetLanguage TEXT NOT NULL,
  intendedUse TEXT NOT NULL,
  perPageRate NUMERIC(10,2) NOT NULL,
  totalBillablePages NUMERIC(10,2) NOT NULL,
  certType TEXT,
  certPrice NUMERIC(10,2),
  quoteTotal NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  userId UUID NULL -- future FK to Users table
);
-- Sample inserts
-- INSERT INTO Quotes (customerName, customerEmail, sourceLanguage, targetLanguage, intendedUse, perPageRate, totalBillablePages, certType, certPrice, quoteTotal)
-- VALUES ('Alice', 'alice@example.com', 'English', 'Spanish', 'USCIS', 78.00, 1.5, 'standard', 20.00, 137.00);
-- INSERT INTO Quotes (customerName, customerEmail, sourceLanguage, targetLanguage, intendedUse, perPageRate, totalBillablePages, certType, certPrice, quoteTotal)
-- VALUES ('Bob', 'bob@example.com', 'French', 'English', 'University', 91.00, 2.0, 'notarized', 40.00, 222.00);
-- UPDATE Quotes SET status='approved' WHERE quoteId=1;
-- SELECT quoteId, quoteTotal FROM Quotes WHERE customerEmail='alice@example.com';

CREATE TABLE QuoteFiles (
  fileId SERIAL PRIMARY KEY,
  quoteId INTEGER NOT NULL REFERENCES Quotes(quoteId) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  pageCount INTEGER NOT NULL
);
-- Sample inserts
-- INSERT INTO QuoteFiles (quoteId, filename, pageCount) VALUES (1, 'passport.pdf', 2);
-- INSERT INTO QuoteFiles (quoteId, filename, pageCount) VALUES (1, 'birth_certificate.pdf', 1);
-- UPDATE QuoteFiles SET filename='passport_scan.pdf' WHERE fileId=1;
-- SELECT * FROM QuoteFiles WHERE quoteId=1;

CREATE TABLE QuotePages (
  pageId SERIAL PRIMARY KEY,
  fileId INTEGER NOT NULL REFERENCES QuoteFiles(fileId) ON DELETE CASCADE,
  pageNumber INTEGER NOT NULL,
  wordCount INTEGER NOT NULL,
  complexity TEXT NOT NULL,
  multiplier NUMERIC(4,2) NOT NULL,
  ppwc NUMERIC(10,2) NOT NULL,
  billablePages NUMERIC(10,2) NOT NULL
);
-- Sample inserts
-- INSERT INTO QuotePages (fileId, pageNumber, wordCount, complexity, multiplier, ppwc, billablePages) VALUES (1, 1, 230, 'Medium', 1.10, 253.00, 1.10);
-- INSERT INTO QuotePages (fileId, pageNumber, wordCount, complexity, multiplier, ppwc, billablePages) VALUES (1, 2, 200, 'Easy', 1.00, 200.00, 0.80);
-- UPDATE QuotePages SET wordCount=240 WHERE pageId=1;
-- SELECT * FROM QuotePages WHERE fileId=1 ORDER BY pageNumber;

CREATE TABLE Languages (
  languageName TEXT PRIMARY KEY,
  tier CHAR(1) NOT NULL
);
-- Sample inserts
-- INSERT INTO Languages (languageName, tier) VALUES ('English','A');
-- INSERT INTO Languages (languageName, tier) VALUES ('Mandarin','B');
-- UPDATE Languages SET tier='B' WHERE languageName='Spanish';
-- SELECT tier FROM Languages WHERE languageName='English';

CREATE TABLE Tiers (
  tier CHAR(1) PRIMARY KEY,
  multiplier NUMERIC(4,2) NOT NULL
);
-- Sample inserts
-- INSERT INTO Tiers (tier, multiplier) VALUES ('A',1.00);
-- INSERT INTO Tiers (tier, multiplier) VALUES ('B',1.20);
-- UPDATE Tiers SET multiplier=1.40 WHERE tier='C';
-- SELECT multiplier FROM Tiers WHERE tier='B';

CREATE TABLE CertificationTypes (
  certType TEXT PRIMARY KEY,
  price NUMERIC(10,2) NOT NULL,
  description TEXT
);
-- Sample inserts
-- INSERT INTO CertificationTypes (certType, price, description) VALUES ('standard',20,'Standard certification');
-- INSERT INTO CertificationTypes (certType, price, description) VALUES ('notarized',40,'Notarized certificate');
-- UPDATE CertificationTypes SET price=25 WHERE certType='standard';
-- SELECT price FROM CertificationTypes WHERE certType='standard';

CREATE TABLE CertificationMap (
  intendedUse TEXT PRIMARY KEY,
  certType TEXT NOT NULL REFERENCES CertificationTypes(certType)
);
-- Sample inserts
-- INSERT INTO CertificationMap (intendedUse, certType) VALUES ('USCIS','standard');
-- INSERT INTO CertificationMap (intendedUse, certType) VALUES ('Immigration','notarized');
-- UPDATE CertificationMap SET certType='notarized' WHERE intendedUse='USCIS';
-- SELECT certType FROM CertificationMap WHERE intendedUse='USCIS';

CREATE TABLE AppSettings (
  settingKey TEXT PRIMARY KEY,
  settingValue TEXT NOT NULL
);
-- Sample inserts
-- INSERT INTO AppSettings (settingKey, settingValue) VALUES ('baseRate','65');
-- INSERT INTO AppSettings (settingKey, settingValue) VALUES ('wordsPerPage','240');
-- UPDATE AppSettings SET settingValue='70' WHERE settingKey='baseRate';
-- SELECT settingValue FROM AppSettings WHERE settingKey='baseRate';

-- Table: quote_jobs
create table if not exists quote_jobs (
  job_id uuid primary key default gen_random_uuid(),
  quote_id text,
  status text not null default 'queued', -- queued | running | succeeded | failed
  error text,
  result jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: quote_job_events
create table if not exists quote_job_events (
  id bigserial primary key,
  job_id uuid references quote_jobs(job_id) on delete cascade,
  ts timestamptz default now(),
  step text,
  message text,
  progress int
);

create index if not exists quote_job_events_jobid_idx
  on quote_job_events(job_id, ts);
