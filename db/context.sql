create view vw_reporte_atenciones_v2
            (ticket_id, fecha_dia, turno_completo, sucursal_id, sucursal_nombre, asesor_id, asesor_nombre,
             ticket_estado, ticket_inicio, ticket_fin, tiempo_espera, tiempo_ejecucion, tramite_id, tramite_codigo,
             tramite_nombre, subtramite_id, subtramite_codigo, subtramite_nombre, subtramite_estado,
             subtramite_observaciones, subtramite_inicio, subtramite_fin, subtramite_especifico_id,
             subtramite_especifico_codigo, subtramite_especifico_nombre)
as
SELECT t.id                       AS ticket_id,
       t.fecha_dia,
       t.turno_completo,
       t.sucursal_id,
       s.nombre                   AS sucursal_nombre,
       u.id                       AS asesor_id,
       upper(u.nombres_completos) AS asesor_nombre,
       t.estado                   AS ticket_estado,
       t.fecha_inicio_atencion    AS ticket_inicio,
       t.fecha_finalizacion       AS ticket_fin,
       CASE
           WHEN t.fecha_inicio_atencion IS NOT NULL AND t.created_at IS NOT NULL THEN round(
                   EXTRACT(epoch FROM t.fecha_inicio_atencion - t.created_at) / 60::numeric, 2)
           ELSE NULL::numeric
           END                    AS tiempo_espera,
       CASE
           WHEN t.fecha_inicio_atencion IS NOT NULL AND t.fecha_finalizacion IS NOT NULL THEN round(
                   EXTRACT(epoch FROM t.fecha_finalizacion - t.fecha_inicio_atencion) / 60::numeric, 2)
           ELSE NULL::numeric
           END                    AS tiempo_ejecucion,
       tm.id                      AS tramite_id,
       tm.codigo                  AS tramite_codigo,
       tm.nombre                  AS tramite_nombre,
       st.id                      AS subtramite_id,
       st.codigo                  AS subtramite_codigo,
       st.nombre                  AS subtramite_nombre,
       atn.estado                 AS subtramite_estado,
       atn.observaciones          AS subtramite_observaciones,
       atn.fecha_inicio           AS subtramite_inicio,
       atn.fecha_fin              AS subtramite_fin,
       st_especifico.id           AS subtramite_especifico_id,
       st_especifico.codigo       AS subtramite_especifico_codigo,
       st_especifico.nombre       AS subtramite_especifico_nombre
FROM gestion_turnos.tickets t
         LEFT JOIN gestion_turnos.sucursales s ON t.sucursal_id = s.id
         LEFT JOIN gestion_turnos.atenciones atn ON t.id = atn.ticket_id
         LEFT JOIN gestion_turnos.subtramites st ON atn.subtramite_id = st.id
         LEFT JOIN gestion_turnos.tramites tm ON st.tramite_id = tm.id
         LEFT JOIN gestion_turnos.usuarios u ON t.asesor_id = u.id
         LEFT JOIN gestion_turnos.subtramites st_especifico ON atn.subtramite_especifico_id = st_especifico.id
ORDER BY t.fecha_dia DESC;

alter table vw_reporte_atenciones_v2
    owner to postgres;

grant delete, insert, select, update on vw_reporte_atenciones_v2 to anon;

grant delete, insert, select, update on vw_reporte_atenciones_v2 to authenticated;

grant delete, insert, references, select, trigger, truncate, update on vw_reporte_atenciones_v2 to service_role;

grant select on vw_reporte_atenciones_v2 to readonly_user;

grant select on vw_reporte_atenciones_v2 to dashboard_viewer;

grant select on vw_reporte_atenciones_v2 to readonly_bi_team;
