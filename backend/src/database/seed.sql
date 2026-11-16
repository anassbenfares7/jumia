BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM vendors WHERE is_approved = true) THEN
        RAISE EXCEPTION 'Create and approve a development vendor before running this seed script.';
    END IF;
END
$$;

WITH selected_vendor AS (
    SELECT id
    FROM vendors
    WHERE is_approved = true
    ORDER BY id
    LIMIT 1
),
sample_products (category_slug, title, description, price, stock) AS (
    VALUES
        ('electronics', 'Sample Wireless Headphones', 'Development catalog sample.', 49.99::NUMERIC, 10),
        ('fashion', 'Sample Cotton T-Shirt', 'Development catalog sample.', 19.99::NUMERIC, 20)
)
INSERT INTO products (vendor_id, category_id, title, description, price, stock)
SELECT selected_vendor.id, categories.id, sample_products.title,
       sample_products.description, sample_products.price, sample_products.stock
FROM selected_vendor
CROSS JOIN sample_products
JOIN categories ON categories.slug = sample_products.category_slug
WHERE NOT EXISTS (
    SELECT 1
    FROM products
    WHERE products.vendor_id = selected_vendor.id
      AND products.title = sample_products.title
);

COMMIT;
