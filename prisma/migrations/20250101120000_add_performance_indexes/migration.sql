-- Добавление индексов для оптимизации производительности

-- Индекс для быстрых запросов по дате доставки
CREATE INDEX IF NOT EXISTS idx_leads_delivery_date ON leads(delivery_date);

-- Индекс для сортировки по created_at  
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

-- Составной индекс для truck_assignments по lead_id и status
CREATE INDEX IF NOT EXISTS idx_truck_assignments_lead_status ON truck_assignments(lead_id, status);

-- Индекс для поиска активных назначений с сортировкой
CREATE INDEX IF NOT EXISTS idx_truck_assignments_status_assigned ON truck_assignments(status, assigned_at DESC);

-- Индекс для быстрого поиска по дате загрузки машин
CREATE INDEX IF NOT EXISTS idx_truck_loadings_date_truck ON truck_loadings(loading_date, truck_name);

-- Индекс для производственных сессий по дате и времени
CREATE INDEX IF NOT EXISTS idx_production_sessions_date_time ON production_sessions(date, time_slot); 