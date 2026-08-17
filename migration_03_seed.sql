-- ============================================================================
-- Nairobi OS — seed inicial (schema public)
-- Ejecutar DESPUÉS de migration_02_core_tables.sql.
-- Las 8 aseguradoras son EXACTAS. No agregar una novena.
-- status='pending' hasta que tengan al menos una rate_table activa — el
-- cotizador solo considera 'active'. Sebastián/Nairobi deciden cuándo
-- pasarlas a 'active'.
-- ============================================================================

insert into public.insurers (code, name, status, commission_default_pct) values
  ('seguros_constitucion',  'Seguros Constitución',        'pending', 10.00),
  ('la_internacional',      'La Internacional de Seguros', 'pending', 10.00),
  ('la_oceanica',           'La Oceánica de Seguros',      'pending', 10.00),
  ('hispana',               'Hispana',                     'pending', 10.00),
  ('mapfre',                'MAPFRE',                      'pending', 10.00),
  ('atrio',                 'Atrio Seguros',                'pending', 10.00),
  ('mercantil',             'Mercantil',                   'pending', 10.00),
  ('seguros_caracas',       'Seguros Caracas',             'pending', 10.00)
on conflict (code) do nothing;

-- Productos base. rating_factors son los campos que el cotizador exige antes
-- de calcular ("need_more_info" si faltan).
insert into public.products (code, name, category, rating_factors) values
  ('rcv_moto',              'RCV Moto',                    'vehiculo', '["edad","cc","año_moto","ciudad"]'),
  ('rcv_auto',              'RCV Auto',                     'vehiculo', '["edad","marca","modelo","año_auto","ciudad"]'),
  ('salud',                 'Seguro de Salud',              'salud',    '["edad","suma_asegurada","preexistencias"]'),
  ('embarazo',               'Seguro de Embarazo',           'salud',    '["edad","semanas_gestacion"]'),
  ('vida',                  'Seguro de Vida',               'vida',     '["edad","suma_asegurada"]'),
  ('hogar',                 'Seguro de Hogar',              'patrimonial','["valor_inmueble","ciudad","tipo_vivienda"]'),
  ('funerario',             'Seguro Funerario',             'vida',     '["edad","numero_beneficiarios"]'),
  ('viaje',                 'Seguro de Viaje',              'viaje',    '["destino","dias_viaje","edad"]'),
  ('accidentes_personales', 'Accidentes Personales',        'salud',    '["edad","ocupacion","suma_asegurada"]')
on conflict (code) do nothing;

-- Settings iniciales. Placeholders explícitos donde falta confirmación de
-- Sebastián — no se inventan valores de negocio reales.
insert into public.settings (key, value) values
  ('mode',                    '"test"'),
  ('timezone',                '"America/Caracas"'),
  ('currency_primary',        '"USD"'),
  ('currency_secondary',      '"VES"'),
  ('business_hours_start',    '8'),
  ('business_hours_end',      '20'),
  ('emergency_contact_phone', 'null'),
  ('test_allowlist',          '[]')
on conflict (key) do nothing;

-- Canal WaAPI de prueba. waapi_instance_id y phone_number deben completarse
-- cuando Sebastián confirme la instancia — no se hardcodea aquí.
insert into public.channel_config (label, is_active, waapi_instance_id, phone_number, notes) values
  ('test', true, null, null, 'Número personal de Sebastián — control/test, NO producción.')
on conflict do nothing;

-- Tarifa oficial ya investigada (research/tarifas_mercantil.md en el repo de
-- n8n): Mercantil Seguros, Emergencias Médicas, prima fija sin variación por
-- edad. Es la única aseguradora con dato calculable hoy — el resto queda
-- pendiente de que Nairobi entregue tarifas reales.
insert into public.rate_research (insurer_id, product_id, source, date_checked, data_type, description, raw_value, usable_for_calculation, confidence, notes)
select i.id, p.id, 'Sitio oficial Mercantil Seguros', current_date, 'official_rate',
       'Emergencias Médicas — prima fija publicada', '$27/mes por $5.000 de cobertura; $41/mes por $10.000',
       true, 'high', 'Sin variación por edad (6 meses–75 años). Único hallazgo official_rate limpio de la investigación pública.'
from public.insurers i, public.products p
where i.code = 'mercantil' and p.code = 'salud'
  and not exists (
    select 1 from public.rate_research rr
    where rr.insurer_id = i.id and rr.product_id = p.id and rr.source = 'Sitio oficial Mercantil Seguros'
  );
