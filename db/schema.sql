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
-- UPDATE Quotes SET status='approved' WHERE quoteId=1;
-- SELECT quoteId, quoteTotal FROM Quotes WHERE customerEmail='alice@example.com';

CREATE TABLE QuoteFiles (
  fileId SERIAL PRIMARY KEY,
  quoteId INTEGER NOT NULL REFERENCES Quotes(quoteId) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  pageCount INTEGER NOT NULL
);
-- INSERT INTO QuoteFiles (quoteId, filename, pageCount) VALUES (1, 'passport.pdf', 2);
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
-- INSERT INTO QuotePages (fileId, pageNumber, wordCount, complexity, multiplier, ppwc, billablePages) VALUES (1, 1, 230, 'Medium', 1.10, 253.00, 1.1);
-- SELECT * FROM QuotePages WHERE fileId=1 ORDER BY pageNumber;

CREATE TABLE Languages (
  languageName TEXT PRIMARY KEY,
  tier CHAR(1) NOT NULL
);
-- INSERT INTO Languages (languageName, tier) VALUES ('English','A'), ('Spanish','A');
-- SELECT tier FROM Languages WHERE languageName='English';

CREATE TABLE Tiers (
  tier CHAR(1) PRIMARY KEY,
  multiplier NUMERIC(4,2) NOT NULL
);
-- INSERT INTO Tiers (tier, multiplier) VALUES ('A',1.00),('B',1.20),('C',1.40);
-- SELECT multiplier FROM Tiers WHERE tier='B';

CREATE TABLE CertificationTypes (
  certType TEXT PRIMARY KEY,
  price NUMERIC(10,2) NOT NULL,
  description TEXT
);
-- INSERT INTO CertificationTypes (certType, price, description) VALUES ('standard',20,'Standard certification'),('notarized',40,'Notarized certificate');
-- SELECT price FROM CertificationTypes WHERE certType='standard';

CREATE TABLE CertificationMap (
  intendedUse TEXT PRIMARY KEY,
  certType TEXT NOT NULL REFERENCES CertificationTypes(certType)
);
-- INSERT INTO CertificationMap (intendedUse, certType) VALUES ('USCIS','standard');
-- SELECT certType FROM CertificationMap WHERE intendedUse='USCIS';

CREATE TABLE AppSettings (
  settingKey TEXT PRIMARY KEY,
  settingValue TEXT NOT NULL
);
-- INSERT INTO AppSettings (settingKey, settingValue) VALUES ('baseRate','65'),('wordsPerPage','240');
-- UPDATE AppSettings SET settingValue='70' WHERE settingKey='baseRate';
-- SELECT settingValue FROM AppSettings WHERE settingKey='baseRate';
