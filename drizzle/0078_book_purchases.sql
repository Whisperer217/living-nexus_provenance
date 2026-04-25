-- Migration 0078: book_purchases table
-- Tracks one-time purchases of gated books/comics

CREATE TABLE IF NOT EXISTS `book_purchases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `song_id` int NOT NULL,
  `buyer_user_id` int NOT NULL,
  `amount_cents` int NOT NULL DEFAULT 0,
  `stripe_session_id` varchar(256),
  `stripe_payment_intent_id` varchar(256),
  `purchased_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `book_purchases_song_buyer_unique` (`song_id`, `buyer_user_id`),
  KEY `book_purchases_song_id_idx` (`song_id`),
  KEY `book_purchases_buyer_idx` (`buyer_user_id`)
);
