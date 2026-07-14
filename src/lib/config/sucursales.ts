/**
 * Fuente de verdad de las sedes de la operación (el CSV original
 * public/data/sucursales_departamentos_latitud_longitud.csv será eliminado).
 *
 * - `id` coincide 1:1 con `sucursal_id` de la vista (validado 2026-07-14).
 * - `nombre` replica el nombre que trae la vista (con tildes).
 * - `departamento` usa la clave canónica del negocio (sin tildes); el match
 *   con el geojson se hace vía DEPARTAMENTO_ALIAS.
 * - `direccion` está estandarizada (Carrera/Calle/Avenida, "#", Title Case)
 *   preservando el significado original.
 */
export interface Sucursal {
  id: string;
  nombre: string;
  departamento: string;
  direccion: string;
  lat: number;
  lng: number;
}

export const SUCURSALES: readonly Sucursal[] = [
  { id: "d90e987a-a1f8-4507-9bc9-1373a8dd3440", nombre: "TUMACO", departamento: "NARIÑO", direccion: "Calle Popayán, Casa 24, División 2", lat: 1.8069, lng: -78.7621 },
  { id: "f2c98821-9735-416a-aae5-ee69be5f3199", nombre: "SAN ANDRÉS", departamento: "SAN ANDRES Y PROVIDENCIA", direccion: "Carrera 4 # 2 - 37, Centro Comercial New Point, Piso 2, Oficina 236", lat: 12.5814, lng: -81.6975 },
  { id: "3864ab76-eb76-4ca4-aab8-e5b0d69a5ade", nombre: "PASTO", departamento: "NARIÑO", direccion: "Carrera 29 # 15 - 04, Barrio Bombonal", lat: 1.2156, lng: -77.2841 },
  { id: "044d49e6-6f0d-45f5-9a0c-fcc6e406351d", nombre: "RIOHACHA", departamento: "LA GUAJIRA", direccion: "Calle 4 # 7 - 29, Barrio Centro", lat: 11.5465, lng: -72.9093 },
  { id: "a945be85-e729-4bac-b18c-98f04eeb69fa", nombre: "CAD SUBA", departamento: "BOGOTA", direccion: "Avenida Calle 145 # 103B - 90, Junto al Portal de Transmilenio de Suba", lat: 4.7431, lng: -74.0986 },
  { id: "245b63cc-45f1-499b-ba33-f1ce422f3fb1", nombre: "SUPER CAD 30", departamento: "BOGOTA", direccion: "Carrera 30 # 25 - 90, Centro Administrativo Distrital CAD", lat: 4.6281, lng: -74.0822 },
  { id: "59822478-b809-477f-b55c-8f52849a0397", nombre: "CÚCUTA", departamento: "NORTE DE SANTANDER", direccion: "Avenida 1 # 18 - 69, Barrio Blanco", lat: 7.8855, lng: -72.5043 },
  { id: "ba858de2-5ae5-4f60-ac40-351dc5e2e7ec", nombre: "POPAYÁN", departamento: "CAUCA", direccion: "Calle 3 # 8 - 57", lat: 2.4422, lng: -76.6068 },
  // ⚠ La dirección original de BUENAVENTURA replica la de CAD Bosa (posible error de la fuente);
  // las coordenadas sí corresponden a Buenaventura y son las que pintan el punto en el mapa.
  { id: "12822c75-209f-4e78-be67-7dbe957bd216", nombre: "BUENAVENTURA", departamento: "VALLE DEL CAUCA", direccion: "Calle 57R Sur # 72D - 12, Junto al Portal de Transmilenio del Sur", lat: 3.8801, lng: -77.0644 },
  { id: "d12f6427-ad5f-455c-8071-626407555d6d", nombre: "CAD BOSA", departamento: "BOGOTA", direccion: "Avenida Calle 57R Sur # 72D - 12", lat: 4.6065, lng: -74.1663 },
  { id: "76c16351-f95c-483c-b780-8e81ec7df513", nombre: "BUCARAMANGA", departamento: "SANTANDER", direccion: "Transversal 93 # 34 - 99, Barrio El Tejar, Cacique Centro Comercial, Semisótano, Local SS10 G-H", lat: 7.0948, lng: -73.1113 },
  { id: "c42b9339-478f-4c20-b5ec-658e10a22599", nombre: "APARTADÓ", departamento: "ANTIOQUIA", direccion: "Calle 104 # 101 - 15, Barrio Vélez, Piso 1, Cámara de Comercio", lat: 7.8829, lng: -76.6341 },
  { id: "2b8990f0-db34-4d40-a45d-ef88870ed8e9", nombre: "ARAUCA", departamento: "ARAUCA", direccion: "Carrera 21 # 16 - 33, Barrio Santa Teresita", lat: 7.0848, lng: -70.7571 },
  // ⚠ Dirección original ambigua ("CARRERA CL. 23"): se interpreta como Calle 23.
  { id: "e22bd302-202d-4995-817b-448ea1c08e6d", nombre: "SINCELEJO", departamento: "SUCRE", direccion: "Calle 23 # 16 - 50", lat: 9.2977, lng: -75.3949 },
  { id: "4f61ae80-de7e-44dc-9a1c-fc5b19fe6609", nombre: "MESA AYUDA", departamento: "BOGOTA", direccion: "Autopista Norte # 94 - 72", lat: 4.6822, lng: -74.0563 },
  { id: "33bfb4d1-bb14-4de3-8e18-25b4adf31d05", nombre: "SANTA MARTA", departamento: "MAGDALENA", direccion: "Carrera 5 # 23 - 131, Barrio Centro", lat: 11.2393, lng: -74.2118 },
  { id: "e4b4a8de-b26e-4f16-b8cd-56be3a4581de", nombre: "ARMENIA", departamento: "QUINDIO", direccion: "Calle 2 Norte # 18 - 209, Local 8", lat: 4.5492, lng: -75.6596 },
  { id: "c97e86d9-840b-472d-8ad7-efb519ab1c65", nombre: "TUNJA", departamento: "BOYACA", direccion: "Calle 22 # 9 - 84", lat: 5.5366, lng: -73.3615 },
  { id: "24bb47ee-273e-48fe-bfbe-907c52ed74cb", nombre: "MONTERIA", departamento: "CORDOBA", direccion: "Carrera 4 # 26 - 46, Local 1", lat: 8.7581, lng: -75.8829 },
  { id: "2bcc889b-6205-4e21-aec2-33387c408d16", nombre: "VILLAVICENCIO", departamento: "META", direccion: "Calle 15 # 37F - 40, Locales 9 y 10", lat: 4.1429, lng: -73.6289 },
  { id: "66d839c7-6566-434a-8a16-8a19c7cfe495", nombre: "IBAGUÉ", departamento: "TOLIMA", direccion: "Carrera 5 # 37 Bis - 19, Edificio Fontainebleau, Oficina 301", lat: 4.4359, lng: -75.2089 },
  { id: "b58f1701-12ff-4d78-afc7-0af39b22bbad", nombre: "FLORENCIA", departamento: "CAQUETA", direccion: "Carrera 10A # 6 - 26, Barrio Las Avenidas", lat: 1.6179, lng: -75.6049 },
  { id: "881626c2-4433-4eed-ba4f-7d9544396b58", nombre: "QUIBDÓ", departamento: "CHOCO", direccion: "Calle 31 # 3 - 27, Piso 1, Barrio Cristo Rey", lat: 5.6924, lng: -76.6582 },
  { id: "04287294-f0d9-45ed-8dfd-805e2ba9e9ee", nombre: "MOCOA", departamento: "PUTUMAYO", direccion: "Carrera 12A # 14 - 75, Barrio San Francisco", lat: 1.1486, lng: -76.6474 },
  { id: "3b9b65f2-90b0-423f-b964-46f70e60a6ea", nombre: "BARRANQUILLA", departamento: "ATLANTICO", direccion: "Carrera 50 # 76 - 54, Local 1", lat: 10.9995, lng: -74.8118 },
  { id: "756baf25-6570-461b-8735-71f64cd94b9c", nombre: "VALLEDUPAR", departamento: "CESAR", direccion: "Carrera 11 # 14 - 33, Barrio Loperena, Centro", lat: 10.4771, lng: -73.2489 },
  { id: "048e7302-7ece-4ce0-9bb2-03042be3e4c0", nombre: "MANIZALES", departamento: "CALDAS", direccion: "Carrera 21 # 65C - 37, Local 1, Edificio Venetto", lat: 5.0555, lng: -75.4872 },
  { id: "cc95bd13-06cf-46af-aa67-ea779d175c6c", nombre: "CALLE 128", departamento: "BOGOTA", direccion: "Carrera 45 # 128B - 41, Piso 2", lat: 4.7144, lng: -74.0543 },
  { id: "a1be8b08-ed01-4233-a8b0-8ee48c6f0fe3", nombre: "CARTAGENA", departamento: "BOLIVAR", direccion: "Avenida Jiménez, Carrera 17 # 26 - 90, Manga, Edificio Henry II", lat: 10.4171, lng: -75.5374 },
  { id: "46a506bb-13ce-4054-b221-744f12d2f0ac", nombre: "LETICIA", departamento: "AMAZONAS", direccion: "Calle 10 # 9 - 88", lat: -4.2138, lng: -69.9424 },
  { id: "c5b61057-c4fc-4c9e-bbf5-35e8b2e5ff61", nombre: "PEREIRA", departamento: "RISARALDA", direccion: "Carrera 15 # 13 - 13, Barrio Los Alpes", lat: 4.8072, lng: -75.6849 },
  { id: "85f41c5a-a829-4dda-a44d-4f30078b8f6e", nombre: "CALI", departamento: "VALLE DEL CAUCA", direccion: "Carrera 68 # 10A - 12, Barrio El Limonar", lat: 3.3971, lng: -76.5363 },
  { id: "21f80b8c-d4c9-40e8-9dff-f441337df7f0", nombre: "YOPAL", departamento: "CASANARE", direccion: "Calle 13 # 25 - 33, Barrio Libertador", lat: 5.3359, lng: -72.3946 },
  { id: "ebb9c7b6-2726-4e83-813e-3cbd3c4376e1", nombre: "MEDELLÍN", departamento: "ANTIOQUIA", direccion: "Carrera 43A # 1 - 50, El Poblado, Centro Empresarial San Fernando Plaza, Local 1-150", lat: 6.2017, lng: -75.5682 },
  { id: "e6593738-3314-4c73-8997-01ab57b24761", nombre: "NEIVA", departamento: "HUILA", direccion: "Carrera 7 # 17 - 20, Barrio Quirinal", lat: 2.9354, lng: -75.2863 },
];

/** Sucursal que define los tickets de Apoyo Operativo (mesa de ayuda). */
export const MESA_AYUDA_ID = "4f61ae80-de7e-44dc-9a1c-fc5b19fe6609";

export const SUCURSAL_BY_ID: ReadonlyMap<string, Sucursal> = new Map(
  SUCURSALES.map((s) => [s.id, s]),
);

/** Departamento canónico → sedes (28 departamentos con presencia). */
export const SEDES_POR_DEPARTAMENTO: ReadonlyMap<string, readonly Sucursal[]> = (() => {
  const map = new Map<string, Sucursal[]>();
  for (const sede of SUCURSALES) {
    const lista = map.get(sede.departamento);
    if (lista) lista.push(sede);
    else map.set(sede.departamento, [sede]);
  }
  return map;
})();

/**
 * Alias canónico → NOMBRE_DPT del geojson (solo difieren estos dos).
 * Para el resto, la clave canónica coincide con NOMBRE_DPT.
 */
export const DEPARTAMENTO_ALIAS: Record<string, string> = {
  BOGOTA: "SANTAFE DE BOGOTA D.C",
  "SAN ANDRES Y PROVIDENCIA":
    "ARCHIPIELAGO DE SAN ANDRES PROVIDENCIA Y SANTA CATALINA",
};

/** NOMBRE_DPT del geojson → clave canónica. */
export const GEOJSON_A_CANONICO: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [canonico, geojson] of Object.entries(DEPARTAMENTO_ALIAS)) {
    map.set(geojson, canonico);
  }
  return map;
})();

export function canonicoDesdeGeojson(nombreDpt: string): string {
  return GEOJSON_A_CANONICO.get(nombreDpt) ?? nombreDpt;
}

export function geojsonDesdeCanonico(departamento: string): string {
  return DEPARTAMENTO_ALIAS[departamento] ?? departamento;
}

/** Nombre para mostrar (Title Case con tildes) por clave canónica o de geojson. */
const DEPARTAMENTO_DISPLAY: Record<string, string> = {
  AMAZONAS: "Amazonas",
  ANTIOQUIA: "Antioquia",
  ARAUCA: "Arauca",
  ATLANTICO: "Atlántico",
  BOGOTA: "Bogotá D.C.",
  BOLIVAR: "Bolívar",
  BOYACA: "Boyacá",
  CALDAS: "Caldas",
  CAQUETA: "Caquetá",
  CASANARE: "Casanare",
  CAUCA: "Cauca",
  CESAR: "Cesar",
  CHOCO: "Chocó",
  CORDOBA: "Córdoba",
  CUNDINAMARCA: "Cundinamarca",
  GUAINIA: "Guainía",
  GUAVIARE: "Guaviare",
  HUILA: "Huila",
  "LA GUAJIRA": "La Guajira",
  MAGDALENA: "Magdalena",
  META: "Meta",
  NARIÑO: "Nariño",
  "NORTE DE SANTANDER": "Norte de Santander",
  PUTUMAYO: "Putumayo",
  QUINDIO: "Quindío",
  RISARALDA: "Risaralda",
  "SAN ANDRES Y PROVIDENCIA": "San Andrés y Providencia",
  SANTANDER: "Santander",
  SUCRE: "Sucre",
  TOLIMA: "Tolima",
  "VALLE DEL CAUCA": "Valle del Cauca",
  VAUPES: "Vaupés",
  VICHADA: "Vichada",
};

export function formatDepartamento(clave: string): string {
  return DEPARTAMENTO_DISPLAY[canonicoDesdeGeojson(clave)] ?? toTitleCase(clave);
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/(^|\s)\p{L}/gu, (letter) => letter.toUpperCase());
}
