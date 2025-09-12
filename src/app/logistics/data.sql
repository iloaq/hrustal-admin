вот бд уже готовая просто неудачно сделал до этого то что мы хотим

-- Table: public.courier_districts

-- DROP TABLE public.courier_districts;

CREATE TABLE public.courier_districts
(
    id bigint NOT NULL DEFAULT nextval('courier_districts_id_seq'::regclass),
    courier_id bigint NOT NULL,
    district_id bigint NOT NULL,
    assigned_at timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active boolean NOT NULL DEFAULT true,
    CONSTRAINT courier_districts_pkey PRIMARY KEY (id),
    CONSTRAINT courier_districts_courier_id_fkey FOREIGN KEY (courier_id)
        REFERENCES public.couriers (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT courier_districts_district_id_fkey FOREIGN KEY (district_id)
        REFERENCES public.districts (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADEД
)

TABLESPACE pg_default;

ALTER TABLE public.courier_districts
    OWNER to postgres;
-- Index: courier_districts_courier_id_district_id_key

-- DROP INDEX public.courier_districts_courier_id_district_id_key;

CREATE UNIQUE INDEX courier_districts_courier_id_district_id_key
    ON public.courier_districts USING btree
    (courier_id ASC NULLS LAST, district_id ASC NULLS LAST)
    TABLESPACE pg_default;

-- Table: public.courier_tasks

-- DROP TABLE public.courier_tasks;

CREATE TABLE public.courier_tasks
(
    id bigint NOT NULL DEFAULT nextval('courier_tasks_id_seq'::regclass),
    courier_id bigint NOT NULL,
    title character varying(255) COLLATE pg_catalog."default" NOT NULL,
    description character varying(1000) COLLATE pg_catalog."default",
    address character varying(500) COLLATE pg_catalog."default",
    client_name character varying(100) COLLATE pg_catalog."default",
    client_phone character varying(20) COLLATE pg_catalog."default",
    task_date date NOT NULL,
    status character varying(50) COLLATE pg_catalog."default" NOT NULL DEFAULT 'pending'::character varying,
    priority character varying(50) COLLATE pg_catalog."default" NOT NULL DEFAULT 'normal'::character varying,
    created_at timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) without time zone NOT NULL,
    completed_at timestamp(3) without time zone,
    notes character varying(1000) COLLATE pg_catalog."default",
    CONSTRAINT courier_tasks_pkey PRIMARY KEY (id),
    CONSTRAINT courier_tasks_courier_id_fkey FOREIGN KEY (courier_id)
        REFERENCES public.couriers (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE public.courier_tasks
    OWNER to postgres;
-- Index: courier_tasks_courier_id_task_date_idx

-- DROP INDEX public.courier_tasks_courier_id_task_date_idx;

CREATE INDEX courier_tasks_courier_id_task_date_idx
    ON public.courier_tasks USING btree
    (courier_id ASC NULLS LAST, task_date ASC NULLS LAST)
    TABLESPACE pg_default;

-- Table: public.courier_vehicle_schedule

-- DROP TABLE public.courier_vehicle_schedule;

CREATE TABLE public.courier_vehicle_schedule
(
    id bigint NOT NULL DEFAULT nextval('courier_vehicle_schedule_id_seq'::regclass),
    courier_id bigint NOT NULL,
    vehicle_id bigint NOT NULL,
    date date NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(100) COLLATE pg_catalog."default",
    notes character varying(500) COLLATE pg_catalog."default",
    CONSTRAINT courier_vehicle_schedule_pkey PRIMARY KEY (id),
    CONSTRAINT courier_vehicle_schedule_courier_id_fkey FOREIGN KEY (courier_id)
        REFERENCES public.couriers (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT courier_vehicle_schedule_vehicle_id_fkey FOREIGN KEY (vehicle_id)
        REFERENCES public.vehicles (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE public.courier_vehicle_schedule
    OWNER to postgres;
-- Index: courier_vehicle_schedule_courier_id_date_idx

-- DROP INDEX public.courier_vehicle_schedule_courier_id_date_idx;

CREATE INDEX courier_vehicle_schedule_courier_id_date_idx
    ON public.courier_vehicle_schedule USING btree
    (courier_id ASC NULLS LAST, date ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: courier_vehicle_schedule_courier_id_vehicle_id_date_key

-- DROP INDEX public.courier_vehicle_schedule_courier_id_vehicle_id_date_key;

CREATE UNIQUE INDEX courier_vehicle_schedule_courier_id_vehicle_id_date_key
    ON public.courier_vehicle_schedule USING btree
    (courier_id ASC NULLS LAST, vehicle_id ASC NULLS LAST, date ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: courier_vehicle_schedule_date_idx

-- DROP INDEX public.courier_vehicle_schedule_date_idx;

CREATE INDEX courier_vehicle_schedule_date_idx
    ON public.courier_vehicle_schedule USING btree
    (date ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: courier_vehicle_schedule_vehicle_id_date_idx

-- DROP INDEX public.courier_vehicle_schedule_vehicle_id_date_idx;

CREATE INDEX courier_vehicle_schedule_vehicle_id_date_idx
    ON public.courier_vehicle_schedule USING btree
    (vehicle_id ASC NULLS LAST, date ASC NULLS LAST)
    TABLESPACE pg_default;

-- Table: public.courier_vehicles

-- DROP TABLE public.courier_vehicles;

CREATE TABLE public.courier_vehicles
(
    id bigint NOT NULL DEFAULT nextval('courier_vehicles_id_seq'::regclass),
    courier_id bigint NOT NULL,
    vehicle_id bigint NOT NULL,
    assigned_at timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active boolean NOT NULL DEFAULT true,
    CONSTRAINT courier_vehicles_pkey PRIMARY KEY (id),
    CONSTRAINT courier_vehicles_courier_id_fkey FOREIGN KEY (courier_id)
        REFERENCES public.couriers (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT courier_vehicles_vehicle_id_fkey FOREIGN KEY (vehicle_id)
        REFERENCES public.vehicles (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE public.courier_vehicles
    OWNER to postgres;
-- Index: courier_vehicles_courier_id_vehicle_id_key

-- DROP INDEX public.courier_vehicles_courier_id_vehicle_id_key;

CREATE UNIQUE INDEX courier_vehicles_courier_id_vehicle_id_key
    ON public.courier_vehicles USING btree
    (courier_id ASC NULLS LAST, vehicle_id ASC NULLS LAST)
    TABLESPACE pg_default;

-- Table: public.couriers

-- DROP TABLE public.couriers;

CREATE TABLE public.couriers
(
    id bigint NOT NULL DEFAULT nextval('couriers_id_seq'::regclass),
    name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    phone character varying(20) COLLATE pg_catalog."default",
    login character varying(50) COLLATE pg_catalog."default" NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) without time zone NOT NULL,
    pin_code character varying(10) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT couriers_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE public.couriers
    OWNER to postgres;
-- Index: couriers_login_key

-- DROP INDEX public.couriers_login_key;

CREATE UNIQUE INDEX couriers_login_key
    ON public.couriers USING btree
    (login COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;
-- Table: public.districts

-- DROP TABLE public.districts;

CREATE TABLE public.districts
(
    id bigint NOT NULL DEFAULT nextval('districts_id_seq'::regclass),
    name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    description character varying(500) COLLATE pg_catalog."default",
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) without time zone NOT NULL,
    CONSTRAINT districts_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE public.districts
    OWNER to postgres;
-- Index: districts_name_key

-- DROP INDEX public.districts_name_key;

CREATE UNIQUE INDEX districts_name_key
    ON public.districts USING btree
    (name COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

-- Table: public.driver_assignments

-- DROP TABLE public.driver_assignments;

CREATE TABLE public.driver_assignments
(
    id bigint NOT NULL DEFAULT nextval('driver_assignments_id_seq'::regclass),
    driver_id bigint NOT NULL,
    lead_id bigint NOT NULL,
    vehicle_id bigint,
    delivery_date date NOT NULL,
    delivery_time character varying(50) COLLATE pg_catalog."default",
    status character varying(50) COLLATE pg_catalog."default" NOT NULL DEFAULT 'assigned'::character varying,
    accepted_at timestamp(3) without time zone,
    started_at timestamp(3) without time zone,
    completed_at timestamp(3) without time zone,
    driver_notes character varying(1000) COLLATE pg_catalog."default",
    created_at timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) without time zone NOT NULL,
    CONSTRAINT driver_assignments_pkey PRIMARY KEY (id),
    CONSTRAINT driver_assignments_driver_id_fkey FOREIGN KEY (driver_id)
        REFERENCES public.drivers (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT driver_assignments_lead_id_fkey FOREIGN KEY (lead_id)
        REFERENCES public.leads (lead_id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT driver_assignments_vehicle_id_fkey FOREIGN KEY (vehicle_id)
        REFERENCES public.vehicles (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL
)

TABLESPACE pg_default;

ALTER TABLE public.driver_assignments
    OWNER to postgres;
-- Index: driver_assignments_driver_id_delivery_date_idx

-- DROP INDEX public.driver_assignments_driver_id_delivery_date_idx;

CREATE INDEX driver_assignments_driver_id_delivery_date_idx
    ON public.driver_assignments USING btree
    (driver_id ASC NULLS LAST, delivery_date ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: driver_assignments_driver_id_lead_id_delivery_date_key

-- DROP INDEX public.driver_assignments_driver_id_lead_id_delivery_date_key;

CREATE UNIQUE INDEX driver_assignments_driver_id_lead_id_delivery_date_key
    ON public.driver_assignments USING btree
    (driver_id ASC NULLS LAST, lead_id ASC NULLS LAST, delivery_date ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: driver_assignments_lead_id_idx

-- DROP INDEX public.driver_assignments_lead_id_idx;

CREATE INDEX driver_assignments_lead_id_idx
    ON public.driver_assignments USING btree
    (lead_id ASC NULLS LAST)
    TABLESPACE pg_default;

-- Table: public.driver_districts

-- DROP TABLE public.driver_districts;

CREATE TABLE public.driver_districts
(
    id bigint NOT NULL DEFAULT nextval('driver_districts_id_seq'::regclass),
    driver_id bigint NOT NULL,
    district_id bigint NOT NULL,
    assigned_at timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active boolean NOT NULL DEFAULT true,
    CONSTRAINT driver_districts_pkey PRIMARY KEY (id),
    CONSTRAINT driver_districts_district_id_fkey FOREIGN KEY (district_id)
        REFERENCES public.districts (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT driver_districts_driver_id_fkey FOREIGN KEY (driver_id)
        REFERENCES public.drivers (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE public.driver_districts
    OWNER to postgres;
-- Index: driver_districts_driver_id_district_id_key

-- DROP INDEX public.driver_districts_driver_id_district_id_key;

CREATE UNIQUE INDEX driver_districts_driver_id_district_id_key
    ON public.driver_districts USING btree
    (driver_id ASC NULLS LAST, district_id ASC NULLS LAST)
    TABLESPACE pg_default;

-- Table: public.driver_vehicles

-- Table: public.drivers

-- DROP TABLE public.drivers;

CREATE TABLE public.drivers
(
    id bigint NOT NULL DEFAULT nextval('drivers_id_seq'::regclass),
    name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    phone character varying(20) COLLATE pg_catalog."default",
    login character varying(50) COLLATE pg_catalog."default" NOT NULL,
    license_number character varying(50) COLLATE pg_catalog."default",
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) without time zone NOT NULL,
    pin_code character varying(10) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT drivers_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE public.drivers
    OWNER to postgres;
-- Index: drivers_login_key

-- DROP INDEX public.drivers_login_key;

CREATE UNIQUE INDEX drivers_login_key
    ON public.drivers USING btree
    (login COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;
-- DROP TABLE public.driver_vehicles;

CREATE TABLE public.driver_vehicles
(
    id bigint NOT NULL DEFAULT nextval('driver_vehicles_id_seq'::regclass),
    driver_id bigint NOT NULL,
    vehicle_id bigint NOT NULL,
    assigned_at timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active boolean NOT NULL DEFAULT true,
    is_primary boolean NOT NULL DEFAULT false,
    CONSTRAINT driver_vehicles_pkey PRIMARY KEY (id),
    CONSTRAINT driver_vehicles_driver_id_fkey FOREIGN KEY (driver_id)
        REFERENCES public.drivers (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT driver_vehicles_vehicle_id_fkey FOREIGN KEY (vehicle_id)
        REFERENCES public.vehicles (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE public.driver_vehicles
    OWNER to postgres;
-- Index: driver_vehicles_driver_id_vehicle_id_key

-- DROP INDEX public.driver_vehicles_driver_id_vehicle_id_key;

CREATE UNIQUE INDEX driver_vehicles_driver_id_vehicle_id_key
    ON public.driver_vehicles USING btree
    (driver_id ASC NULLS LAST, vehicle_id ASC NULLS LAST)
    TABLESPACE pg_default;

-- Table: public.leads

-- Table: public.production_orders

-- DROP TABLE public.production_orders;

CREATE TABLE public.production_orders
(
    id bigint NOT NULL DEFAULT nextval('production_orders_id_seq'::regclass),
    lead_id bigint NOT NULL,
    product_id bigint NOT NULL,
    quantity integer NOT NULL,
    status character varying(50) COLLATE pg_catalog."default" NOT NULL DEFAULT 'pending'::character varying,
    priority character varying(50) COLLATE pg_catalog."default" NOT NULL DEFAULT 'normal'::character varying,
    production_date date NOT NULL,
    delivery_date date NOT NULL,
    created_at timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) without time zone NOT NULL,
    completed_at timestamp(3) without time zone,
    notes character varying(500) COLLATE pg_catalog."default",
    CONSTRAINT production_orders_pkey PRIMARY KEY (id),
    CONSTRAINT production_orders_lead_id_fkey FOREIGN KEY (lead_id)
        REFERENCES public.leads (lead_id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT production_orders_product_id_fkey FOREIGN KEY (product_id)
        REFERENCES public.products (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE RESTRICT
)

TABLESPACE pg_default;

ALTER TABLE public.production_orders
    OWNER to postgres;
-- DROP TABLE public.leads;

CREATE TABLE public.leads
(
    lead_id bigint NOT NULL,
    name character varying(255) COLLATE pg_catalog."default",
    status_id bigint,
    status_name character varying(255) COLLATE pg_catalog."default",
    responsible_user_id bigint,
    responsible_user_name character varying(255) COLLATE pg_catalog."default",
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    delivery_date date,
    products jsonb,
    total_liters numeric(65,30),
    info jsonb,
    delivery_time character varying(255) COLLATE pg_catalog."default",
    na_zamenu boolean,
    oplata character varying(255) COLLATE pg_catalog."default",
    comment character varying(600) COLLATE pg_catalog."default",
    odin_s character varying(255) COLLATE pg_catalog."default",
    dotavleno boolean DEFAULT false,
    route_exported_at timestamp(3) without time zone,
    stat_oplata integer DEFAULT 1,
    price character varying(255) COLLATE pg_catalog."default",
    CONSTRAINT leads_pkey PRIMARY KEY (lead_id)
)

TABLESPACE pg_default;

ALTER TABLE public.leads
    OWNER to postgres;

-- Table: public.production_orders

-- DROP TABLE public.production_orders;

CREATE TABLE public.production_orders
(
    id bigint NOT NULL DEFAULT nextval('production_orders_id_seq'::regclass),
    lead_id bigint NOT NULL,
    product_id bigint NOT NULL,
    quantity integer NOT NULL,
    status character varying(50) COLLATE pg_catalog."default" NOT NULL DEFAULT 'pending'::character varying,
    priority character varying(50) COLLATE pg_catalog."default" NOT NULL DEFAULT 'normal'::character varying,
    production_date date NOT NULL,
    delivery_date date NOT NULL,
    created_at timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) without time zone NOT NULL,
    completed_at timestamp(3) without time zone,
    notes character varying(500) COLLATE pg_catalog."default",
    CONSTRAINT production_orders_pkey PRIMARY KEY (id),
    CONSTRAINT production_orders_lead_id_fkey FOREIGN KEY (lead_id)
        REFERENCES public.leads (lead_id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT production_orders_product_id_fkey FOREIGN KEY (product_id)
        REFERENCES public.products (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE RESTRICT
)

TABLESPACE pg_default;

ALTER TABLE public.production_orders
    OWNER to postgres;

-- Table: public.products

-- DROP TABLE public.products;

CREATE TABLE public.products
(
    id bigint NOT NULL DEFAULT nextval('products_id_seq'::regclass),
    name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    type character varying(50) COLLATE pg_catalog."default" NOT NULL,
    volume numeric(65,30),
    price numeric(65,30),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) without time zone NOT NULL,
    CONSTRAINT products_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE public.products
    OWNER to postgres;

-- Table: public.truck_assignments

-- DROP TABLE public.truck_assignments;

CREATE TABLE public.truck_assignments
(
    id bigint NOT NULL DEFAULT nextval('truck_assignments_id_seq'::regclass),
    lead_id bigint NOT NULL,
    truck_name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    delivery_date date NOT NULL,
    delivery_time character varying(50) COLLATE pg_catalog."default" NOT NULL,
    assigned_at timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by character varying(100) COLLATE pg_catalog."default",
    status character varying(50) COLLATE pg_catalog."default" NOT NULL DEFAULT 'active'::character varying,
    notes character varying(500) COLLATE pg_catalog."default",
    CONSTRAINT truck_assignments_pkey PRIMARY KEY (id),
    CONSTRAINT truck_assignments_lead_id_fkey FOREIGN KEY (lead_id)
        REFERENCES public.leads (lead_id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE public.truck_assignments
    OWNER to postgres;
-- Index: truck_assignments_lead_id_delivery_date_key

-- DROP INDEX public.truck_assignments_lead_id_delivery_date_key;

CREATE UNIQUE INDEX truck_assignments_lead_id_delivery_date_key
    ON public.truck_assignments USING btree
    (lead_id ASC NULLS LAST, delivery_date ASC NULLS LAST)
    TABLESPACE pg_default;

-- Table: public.truck_configs

-- DROP TABLE public.truck_configs;

CREATE TABLE public.truck_configs
(
    id bigint NOT NULL DEFAULT nextval('truck_configs_id_seq'::regclass),
    date date NOT NULL,
    "totalTrucks" integer NOT NULL,
    "regionGroups" text COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) without time zone NOT NULL,
    CONSTRAINT truck_configs_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE public.truck_configs
    OWNER to postgres;
-- Index: truck_configs_date_key

-- DROP INDEX public.truck_configs_date_key;

CREATE UNIQUE INDEX truck_configs_date_key
    ON public.truck_configs USING btree
    (date ASC NULLS LAST)
    TABLESPACE pg_default;

-- Table: public.truck_loadings

-- DROP TABLE public.truck_loadings;

CREATE TABLE public.truck_loadings
(
    id bigint NOT NULL DEFAULT nextval('truck_loadings_id_seq'::regclass),
    loading_date date NOT NULL,
    truck_name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    truck_area character varying(100) COLLATE pg_catalog."default" NOT NULL,
    time_slot character varying(50) COLLATE pg_catalog."default" NOT NULL,
    hrustalnaya_orders integer NOT NULL DEFAULT 0,
    malysh_orders integer NOT NULL DEFAULT 0,
    selen_orders integer NOT NULL DEFAULT 0,
    hrustalnaya_free integer NOT NULL DEFAULT 0,
    malysh_free integer NOT NULL DEFAULT 0,
    selen_free integer NOT NULL DEFAULT 0,
    notes character varying(500) COLLATE pg_catalog."default",
    created_at timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by character varying(100) COLLATE pg_catalog."default",
    CONSTRAINT truck_loadings_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE public.truck_loadings
    OWNER to postgres;
-- Index: truck_loadings_loading_date_idx

-- DROP INDEX public.truck_loadings_loading_date_idx;

CREATE INDEX truck_loadings_loading_date_idx
    ON public.truck_loadings USING btree
    (loading_date ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: truck_loadings_loading_date_truck_name_time_slot_key

-- DROP INDEX public.truck_loadings_loading_date_truck_name_time_slot_key;

CREATE UNIQUE INDEX truck_loadings_loading_date_truck_name_time_slot_key
    ON public.truck_loadings USING btree
    (loading_date ASC NULLS LAST, truck_name COLLATE pg_catalog."default" ASC NULLS LAST, time_slot COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

-- Table: public.vehicle_district_schedule

-- DROP TABLE public.vehicle_district_schedule;

CREATE TABLE public.vehicle_district_schedule
(
    id bigint NOT NULL DEFAULT nextval('vehicle_district_schedule_id_seq'::regclass),
    vehicle_id bigint NOT NULL,
    district_id bigint NOT NULL,
    date date NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(100) COLLATE pg_catalog."default",
    notes character varying(500) COLLATE pg_catalog."default",
    CONSTRAINT vehicle_district_schedule_pkey PRIMARY KEY (id),
    CONSTRAINT vehicle_district_schedule_district_id_fkey FOREIGN KEY (district_id)
        REFERENCES public.districts (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT vehicle_district_schedule_vehicle_id_fkey FOREIGN KEY (vehicle_id)
        REFERENCES public.vehicles (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE public.vehicle_district_schedule
    OWNER to postgres;
-- Index: vehicle_district_schedule_date_idx

-- DROP INDEX public.vehicle_district_schedule_date_idx;

CREATE INDEX vehicle_district_schedule_date_idx
    ON public.vehicle_district_schedule USING btree
    (date ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: vehicle_district_schedule_district_id_date_idx

-- DROP INDEX public.vehicle_district_schedule_district_id_date_idx;

CREATE INDEX vehicle_district_schedule_district_id_date_idx
    ON public.vehicle_district_schedule USING btree
    (district_id ASC NULLS LAST, date ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: vehicle_district_schedule_vehicle_id_date_idx

-- DROP INDEX public.vehicle_district_schedule_vehicle_id_date_idx;

CREATE INDEX vehicle_district_schedule_vehicle_id_date_idx
    ON public.vehicle_district_schedule USING btree
    (vehicle_id ASC NULLS LAST, date ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: vehicle_district_schedule_vehicle_id_district_id_date_key

-- DROP INDEX public.vehicle_district_schedule_vehicle_id_district_id_date_key;

CREATE UNIQUE INDEX vehicle_district_schedule_vehicle_id_district_id_date_key
    ON public.vehicle_district_schedule USING btree
    (vehicle_id ASC NULLS LAST, district_id ASC NULLS LAST, date ASC NULLS LAST)
    TABLESPACE pg_default;

-- Table: public.vehicle_districts

-- DROP TABLE public.vehicle_districts;

CREATE TABLE public.vehicle_districts
(
    id bigint NOT NULL DEFAULT nextval('vehicle_districts_id_seq'::regclass),
    vehicle_id bigint NOT NULL,
    district_id bigint NOT NULL,
    assigned_at timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active boolean NOT NULL DEFAULT true,
    CONSTRAINT vehicle_districts_pkey PRIMARY KEY (id),
    CONSTRAINT vehicle_districts_district_id_fkey FOREIGN KEY (district_id)
        REFERENCES public.districts (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT vehicle_districts_vehicle_id_fkey FOREIGN KEY (vehicle_id)
        REFERENCES public.vehicles (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE public.vehicle_districts
    OWNER to postgres;
-- Index: vehicle_districts_vehicle_id_district_id_key

-- DROP INDEX public.vehicle_districts_vehicle_id_district_id_key;

CREATE UNIQUE INDEX vehicle_districts_vehicle_id_district_id_key
    ON public.vehicle_districts USING btree
    (vehicle_id ASC NULLS LAST, district_id ASC NULLS LAST)
    TABLESPACE pg_default;

-- Table: public.vehicles

-- DROP TABLE public.vehicles;

CREATE TABLE public.vehicles
(
    id bigint NOT NULL DEFAULT nextval('vehicles_id_seq'::regclass),
    name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    brand character varying(100) COLLATE pg_catalog."default",
    license_plate character varying(20) COLLATE pg_catalog."default",
    capacity integer,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) without time zone NOT NULL,
    CONSTRAINT vehicles_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE public.vehicles
    OWNER to postgres;
-- Index: vehicles_name_key

-- DROP INDEX public.vehicles_name_key;

CREATE UNIQUE INDEX vehicles_name_key
    ON public.vehicles USING btree
    (name COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;