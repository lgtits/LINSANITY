-- 費率表：extraActivities 每筆活動新增 multiPerson 欄位（已為 JSONB，無需 ALTER）
-- 資料格式從 [{ id, name, amount }] 變為 [{ id, name, amount, multiPerson }]
-- 舊資料補上 multiPerson: false
UPDATE tuition_rates
SET extra_activities = (
  SELECT jsonb_agg(
    CASE
      WHEN elem ? 'multiPerson' THEN elem
      ELSE elem || '{"multiPerson": false}'::jsonb
    END
  )
  FROM jsonb_array_elements(extra_activities) AS elem
)
WHERE jsonb_array_length(extra_activities) > 0;

-- 報名表 & 簽到表：extraActivities 從 ["ea1"] 變為 [{ id, qty }]
-- 舊資料轉換：字串 → { id: 字串, qty: 1 }
UPDATE tuition_enrollments
SET extra_activities = (
  SELECT jsonb_agg(
    CASE
      WHEN jsonb_typeof(elem) = 'string' THEN jsonb_build_object('id', elem, 'qty', 1)
      ELSE elem
    END
  )
  FROM jsonb_array_elements(extra_activities) AS elem
)
WHERE jsonb_array_length(extra_activities) > 0;

UPDATE attendance_logs
SET extra_activities = (
  SELECT jsonb_agg(
    CASE
      WHEN jsonb_typeof(elem) = 'string' THEN jsonb_build_object('id', elem, 'qty', 1)
      ELSE elem
    END
  )
  FROM jsonb_array_elements(extra_activities) AS elem
)
WHERE jsonb_array_length(extra_activities) > 0;
