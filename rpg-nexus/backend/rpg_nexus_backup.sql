--
-- PostgreSQL database dump
--

\restrict aNrsmMghojnW6R2j0JbM02PEcq1cS6pRgOE9LANUZd9YEmWUTti1XhDpXQSNNQf

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AnimationType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AnimationType" AS ENUM (
    'IMAGE',
    'GIF',
    'VIDEO',
    'SPRITE'
);


ALTER TYPE public."AnimationType" OWNER TO postgres;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'PLAYER'
);


ALTER TYPE public."Role" OWNER TO postgres;

--
-- Name: TriggerType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TriggerType" AS ENUM (
    'MANUAL',
    'AUTO',
    'CONDITIONAL',
    'TIMED'
);


ALTER TYPE public."TriggerType" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Animation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Animation" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "fileUrl" text NOT NULL,
    "fileType" public."AnimationType" DEFAULT 'IMAGE'::public."AnimationType" NOT NULL,
    "positionX" double precision,
    "positionY" double precision,
    width double precision,
    height double precision,
    duration integer,
    loop boolean DEFAULT false NOT NULL,
    "autoPlay" boolean DEFAULT false NOT NULL,
    trigger public."TriggerType" DEFAULT 'MANUAL'::public."TriggerType" NOT NULL,
    "triggerData" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "gameId" text NOT NULL
);


ALTER TABLE public."Animation" OWNER TO postgres;

--
-- Name: Character; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Character" (
    id text NOT NULL,
    name text NOT NULL,
    avatar text,
    data jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "gameId" text NOT NULL,
    "ownerId" text NOT NULL,
    "modelId" text
);


ALTER TABLE public."Character" OWNER TO postgres;

--
-- Name: CustomModel; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."CustomModel" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    schema jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "gameId" text NOT NULL
);


ALTER TABLE public."CustomModel" OWNER TO postgres;

--
-- Name: DiceRoll; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DiceRoll" (
    id text NOT NULL,
    "gameId" text NOT NULL,
    "userId" text NOT NULL,
    username text NOT NULL,
    formula text NOT NULL,
    "diceType" integer NOT NULL,
    count integer NOT NULL,
    modifier integer NOT NULL,
    results jsonb NOT NULL,
    total integer NOT NULL,
    reason text,
    advantage boolean DEFAULT false NOT NULL,
    disadvantage boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DiceRoll" OWNER TO postgres;

--
-- Name: Game; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Game" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "coverImage" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "customStyles" jsonb,
    "ownerId" text NOT NULL
);


ALTER TABLE public."Game" OWNER TO postgres;

--
-- Name: GamePlayer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."GamePlayer" (
    id text NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "gameId" text NOT NULL,
    "playerId" text NOT NULL
);


ALTER TABLE public."GamePlayer" OWNER TO postgres;

--
-- Name: TacticalMap; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TacticalMap" (
    id text NOT NULL,
    "gameId" text NOT NULL,
    "gridSize" integer DEFAULT 50 NOT NULL,
    "gridWidth" integer DEFAULT 20 NOT NULL,
    "gridHeight" integer DEFAULT 15 NOT NULL,
    "gridColor" text DEFAULT '#444444'::text NOT NULL,
    "backgroundColor" text DEFAULT '#1a1a1a'::text NOT NULL,
    "cellUnit" text DEFAULT '5ft'::text NOT NULL,
    tokens jsonb DEFAULT '[]'::jsonb NOT NULL,
    drawings jsonb DEFAULT '[]'::jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TacticalMap" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    role public."Role" DEFAULT 'PLAYER'::public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: assets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assets (
    id text NOT NULL,
    name text NOT NULL,
    filename text NOT NULL,
    url text NOT NULL,
    type text NOT NULL,
    category text NOT NULL,
    size integer NOT NULL,
    "gameId" text NOT NULL,
    "uploaderId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.assets OWNER TO postgres;

--
-- Data for Name: Animation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Animation" (id, name, description, "fileUrl", "fileType", "positionX", "positionY", width, height, duration, loop, "autoPlay", trigger, "triggerData", "createdAt", "updatedAt", "gameId") FROM stdin;
\.


--
-- Data for Name: Character; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Character" (id, name, avatar, data, "createdAt", "updatedAt", "gameId", "ownerId", "modelId") FROM stdin;
f771a7eb-3164-41ba-a8db-0125d1c9c4e3	aa	https://upload.wikimedia.org/wikipedia/commons/e/e2/Portrait_of_Neytiri.jpg	{"Race": "Ekj", "éé": 12}	2025-12-14 22:13:46.69	2025-12-14 22:23:12.972	8009133d-c68a-418f-a58e-2eadf4c8c192	28011ce3-691a-4355-a724-eee67c4452ac	d773f905-8516-4154-ba21-079360c7c956
930581a0-0e9c-4c3d-bad8-52d0932e4a67	AAAA	http://localhost:3000/uploads/8009133d-c68a-418f-a58e-2eadf4c8c192/broadsword-1765836375608-20042604.png	{"Race": "Bg", "éé": 10}	2025-12-15 21:59:51.378	2025-12-15 22:15:49.116	8009133d-c68a-418f-a58e-2eadf4c8c192	28011ce3-691a-4355-a724-eee67c4452ac	d773f905-8516-4154-ba21-079360c7c956
a2e39f66-b1bc-48c6-bb68-de4e16fcf499	Kems	http://localhost:3000/uploads/8009133d-c68a-418f-a58e-2eadf4c8c192/goblin-giant-1765905673582-573295903.png	{"Mana": 10, "Race": "Chef", "Force": 0}	2025-12-16 17:19:53.467	2025-12-16 17:21:23.959	8009133d-c68a-418f-a58e-2eadf4c8c192	28011ce3-691a-4355-a724-eee67c4452ac	3c32071a-ab84-43ae-92c6-a3b547f1eaf9
6fe9b73a-4dc8-4483-951c-d6d238b2e93f	belo	http://localhost:3000/uploads/8009133d-c68a-418f-a58e-2eadf4c8c192/goblin-giant-1765905673582-573295903.png	{"Race": "", "race": "elf", "Force": 10, "FDKULFLUFLUFP7": ""}	2025-12-16 17:40:16.678	2025-12-16 17:40:56.987	8009133d-c68a-418f-a58e-2eadf4c8c192	28011ce3-691a-4355-a724-eee67c4452ac	3c32071a-ab84-43ae-92c6-a3b547f1eaf9
429fbd31-52c2-4b72-b274-db4a0d198c16	bg	\N	{"Race": "", "race": "", "Force": 10, "FDKULFLUFLUFP7": ""}	2025-12-17 21:59:28.076	2025-12-17 21:59:28.076	8009133d-c68a-418f-a58e-2eadf4c8c192	064f7709-472a-4850-89d5-f911575c8f6d	3c32071a-ab84-43ae-92c6-a3b547f1eaf9
\.


--
-- Data for Name: CustomModel; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."CustomModel" (id, name, description, schema, "createdAt", "updatedAt", "gameId") FROM stdin;
d773f905-8516-4154-ba21-079360c7c956	2	éé	{"stats": {"éé": {"max": 20, "min": 1, "type": "number", "default": 10}}, "fields": {"Race": {"type": "text", "required": false}}}	2025-12-14 19:42:18.293	2025-12-14 22:15:10.794	8009133d-c68a-418f-a58e-2eadf4c8c192
3c32071a-ab84-43ae-92c6-a3b547f1eaf9	GOBELIN	Template gobelin	{"stats": {"Force": {"max": 20, "min": 1, "type": "number", "default": 10}}, "fields": {"Race": {"type": "select", "options": ["Chef", "ptitreuf"], "required": false}, "race": {"type": "select", "options": ["HUM", "elf"], "required": false}, "FDKULFLUFLUFP7": {"type": "text", "required": false}}}	2025-12-16 17:17:54.185	2025-12-16 17:39:29.787	8009133d-c68a-418f-a58e-2eadf4c8c192
\.


--
-- Data for Name: DiceRoll; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DiceRoll" (id, "gameId", "userId", username, formula, "diceType", count, modifier, results, total, reason, advantage, disadvantage, "createdAt") FROM stdin;
a136384e-a259-47c8-84e2-db565744f632	8009133d-c68a-418f-a58e-2eadf4c8c192	28011ce3-691a-4355-a724-eee67c4452ac	Père Belo	1d20	20	1	0	[5]	5	\N	f	f	2025-12-17 17:14:41.625
9c268220-8e40-480d-8650-48bb2097f0d3	8009133d-c68a-418f-a58e-2eadf4c8c192	064f7709-472a-4850-89d5-f911575c8f6d	test	1d20	20	1	0	[3]	3	\N	f	f	2025-12-17 17:47:35.748
7752d700-f0b8-4723-8a15-c1395dfe21d7	8009133d-c68a-418f-a58e-2eadf4c8c192	064f7709-472a-4850-89d5-f911575c8f6d	test	1d20	20	1	0	[5]	5	\N	f	f	2025-12-17 17:47:36.713
2eb6c1ea-bb49-4305-b78e-940703fc4102	8009133d-c68a-418f-a58e-2eadf4c8c192	064f7709-472a-4850-89d5-f911575c8f6d	test	1d20	20	1	0	[5]	5	\N	f	f	2025-12-17 17:47:36.885
125342f1-2d39-418d-9e56-3afdc45bb711	8009133d-c68a-418f-a58e-2eadf4c8c192	064f7709-472a-4850-89d5-f911575c8f6d	test	1d20	20	1	0	[15]	15	\N	f	f	2025-12-17 17:47:43.28
0d98a3ed-5a97-498e-b2d2-fd93cc44a1e9	8009133d-c68a-418f-a58e-2eadf4c8c192	064f7709-472a-4850-89d5-f911575c8f6d	test	1d20	20	1	0	[1]	1	\N	f	f	2025-12-17 17:47:44.398
5ba48895-edaf-4807-86e5-cc6508132224	8009133d-c68a-418f-a58e-2eadf4c8c192	064f7709-472a-4850-89d5-f911575c8f6d	test	1d20	20	1	0	[2]	2	\N	f	f	2025-12-17 17:47:45.287
77e726ef-ca81-4f98-b6de-da932ba7c02e	8009133d-c68a-418f-a58e-2eadf4c8c192	064f7709-472a-4850-89d5-f911575c8f6d	test	1d100	100	1	0	[15]	15	\N	f	f	2025-12-17 17:48:03.877
249bd6ba-4a1c-48f3-937c-88176bf0e81f	8009133d-c68a-418f-a58e-2eadf4c8c192	064f7709-472a-4850-89d5-f911575c8f6d	test	1d100	100	1	0	[94]	94	\N	f	f	2025-12-17 17:48:07.556
681ca54b-481a-4709-839e-cf830b5a9e9b	8009133d-c68a-418f-a58e-2eadf4c8c192	064f7709-472a-4850-89d5-f911575c8f6d	test	1d100	100	1	0	[76]	76	\N	f	f	2025-12-17 17:48:09.272
f3c732be-e563-4141-a508-55751a8744c3	8009133d-c68a-418f-a58e-2eadf4c8c192	064f7709-472a-4850-89d5-f911575c8f6d	test	1d100	100	1	0	[74]	74	\N	f	f	2025-12-17 17:48:10.795
4178323b-ccde-40f7-a1ce-a48f75771d52	8009133d-c68a-418f-a58e-2eadf4c8c192	064f7709-472a-4850-89d5-f911575c8f6d	test	1d100	100	1	0	[73]	73	\N	f	f	2025-12-17 17:48:12.635
0d68ce97-b7e8-40f6-b98c-7b35b93468e1	8009133d-c68a-418f-a58e-2eadf4c8c192	064f7709-472a-4850-89d5-f911575c8f6d	test	1d100	100	1	0	[60]	60	\N	f	f	2025-12-17 17:48:15.355
21c8b87c-0abd-4f5f-895b-299369b2f1d0	8009133d-c68a-418f-a58e-2eadf4c8c192	064f7709-472a-4850-89d5-f911575c8f6d	test	1d100	100	1	0	[99]	99	1d100	f	f	2025-12-17 18:31:06.484
d9d45450-2c9d-4346-96bb-e00109b29563	8009133d-c68a-418f-a58e-2eadf4c8c192	064f7709-472a-4850-89d5-f911575c8f6d	test	1d20+5	20	1	5	[20]	25	\N	f	f	2025-12-17 18:31:51.309
9ef44601-7aa3-4ba3-b213-d807acb61f3e	8009133d-c68a-418f-a58e-2eadf4c8c192	064f7709-472a-4850-89d5-f911575c8f6d	test	3d6	6	3	0	[5, 4, 2]	11	\N	f	f	2025-12-17 18:32:16.702
bfa84c18-8909-4bfd-85ae-2e0f0dee7360	8009133d-c68a-418f-a58e-2eadf4c8c192	28011ce3-691a-4355-a724-eee67c4452ac	Père Belo	1d20	20	1	0	[13]	13	Avantage: 1d20	f	f	2025-12-22 15:57:36.728
465bf26a-7160-4351-beda-4cc9d82b9390	8009133d-c68a-418f-a58e-2eadf4c8c192	28011ce3-691a-4355-a724-eee67c4452ac	Père Belo	1d20	20	1	0	[5]	5	Avantage: 1d20	f	f	2025-12-22 15:57:38.694
f1f02c2b-45c8-4624-89e8-fcd67b7459bd	8009133d-c68a-418f-a58e-2eadf4c8c192	28011ce3-691a-4355-a724-eee67c4452ac	Père Belo	1d20	20	1	0	[8]	8	Avantage: 1d20	f	f	2025-12-22 15:57:39.644
\.


--
-- Data for Name: Game; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Game" (id, name, description, "coverImage", "isActive", "createdAt", "updatedAt", "customStyles", "ownerId") FROM stdin;
b1973555-83d3-4d8b-9adc-f6d75c97d117	Campagne de Test	Ma première partie RPG-Nexus	\N	t	2025-12-09 22:40:44.172	2025-12-09 22:40:44.172	{"primaryColor": "#e63946", "backgroundColor": "#1a1a2e"}	2353b9c9-7573-4d51-94b4-8ff753c170b2
8009133d-c68a-418f-a58e-2eadf4c8c192	Clash Gang	Clash Royale 	https://images2.alphacoders.com/112/thumb-1920-1124066.jpg	t	2025-12-11 18:37:19.655	2025-12-16 17:15:09.733	{"primaryColor": "#6366f1", "backgroundSize": "cover", "secondaryColor": "#8b5cf6", "backgroundColor": "#1f2937", "backgroundImage": "", "backgroundPosition": "center"}	28011ce3-691a-4355-a724-eee67c4452ac
\.


--
-- Data for Name: GamePlayer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."GamePlayer" (id, "joinedAt", "gameId", "playerId") FROM stdin;
7cf0427d-00ff-45e6-b915-1dd1e43b5597	2025-12-09 22:56:18.339	b1973555-83d3-4d8b-9adc-f6d75c97d117	3f5c8864-cb04-4954-8569-4de0690f12cc
95ae87cc-f135-4476-ae63-2c494bf47c15	2025-12-17 17:45:38.614	8009133d-c68a-418f-a58e-2eadf4c8c192	08787674-8c4d-4073-afbb-38a627c8cb77
6ee42a1b-3173-45c1-a71f-c44717c07647	2025-12-17 17:46:41.787	8009133d-c68a-418f-a58e-2eadf4c8c192	064f7709-472a-4850-89d5-f911575c8f6d
\.


--
-- Data for Name: TacticalMap; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TacticalMap" (id, "gameId", "gridSize", "gridWidth", "gridHeight", "gridColor", "backgroundColor", "cellUnit", tokens, drawings, "createdAt", "updatedAt") FROM stdin;
0995562e-8080-4f34-babb-9d589d447369	8009133d-c68a-418f-a58e-2eadf4c8c192	50	20	15	#444444	#1a1a1a	5ft	[{"x": 5, "y": 1, "id": "token_1766079925717_t6k3ganiw", "name": "Token", "size": 1, "color": "#ff0000", "isEnemy": false}, {"x": 3, "y": 2, "id": "token_1766079926377_aahuemy5j", "name": "Token", "size": 1, "color": "#ff0000", "isEnemy": false}, {"x": 4, "y": 5, "id": "token_1766079926861_7w3ofg9ny", "name": "Token", "size": 1, "color": "#ff0000", "isEnemy": false}]	[{"id": "drawing_1766081823466_8pzmnm8v8", "type": "line", "color": "#ff0000", "points": [6.34, 4.36, 7.66, 4.36], "strokeWidth": 10}]	2025-12-18 17:29:37.642	2025-12-18 18:17:16.829
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, email, username, password, role, "createdAt", "updatedAt") FROM stdin;
2353b9c9-7573-4d51-94b4-8ff753c170b2	admin@rpg.com	MaitreDuJeu	$2b$10$XrqoigD3zdGm2ekemPq8deSa7oYwSGgKdDnRoDaHPq98wPGTCf8E.	ADMIN	2025-12-09 21:53:36.544	2025-12-09 21:53:36.544
3f5c8864-cb04-4954-8569-4de0690f12cc	joueur1@rpg.com	Guerrier	$2b$10$sxZ2UvW9GepRdbMh2oNATO.i3vGXYSIm1CqbihaT3rkgyFLyP.bgW	PLAYER	2025-12-09 22:47:04.207	2025-12-09 22:47:04.207
28011ce3-691a-4355-a724-eee67c4452ac	belo@rpg.fr	Père Belo	$2b$10$KHsH2qKgXCqoyipvp1fKquF60qcr41n1XRCqCaav5oywaK0tGQgTa	ADMIN	2025-12-11 18:35:47.483	2025-12-11 18:35:47.483
08787674-8c4d-4073-afbb-38a627c8cb77	test2@rpg.fr	Baza	$2b$10$k5Lk3I3fMBwGaZ5Mwy0I/OCQvzDVShj/2uF/AxdXcz60sg/AQSsL6	PLAYER	2025-12-11 18:59:02.784	2025-12-11 18:59:02.784
064f7709-472a-4850-89d5-f911575c8f6d	test@rpg.fr	test	$2b$10$qDyTEsQR7aEqV0sBKON8S.ECvArwDdY5RKmJT0/arA5ZaJtzN5rQW	PLAYER	2025-12-17 17:46:17.216	2025-12-17 17:46:17.216
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
27bd82bd-91f0-4160-bd10-4644cd40849f	48ad382be6b4436b5dd06ab966ab8ae1f621fc28963fd41eb7b67cd4f1430d48	2025-12-09 22:10:06.975692+01	20251209211006_init	\N	\N	2025-12-09 22:10:06.946208+01	1
574bbfab-67f9-41f7-b247-41858d9522ee	9b89ed43a7fb71da4589ae1b472468498f5261ec62a14797b0e4ce09448d1d1b	2025-12-15 21:56:53.027925+01	20251215205652_add_asset_module	\N	\N	2025-12-15 21:56:53.01069+01	1
6a0020c3-fc26-42cb-9bc7-82d3b5490097	d502e08c650b6a2691a5a558679b0618bcb1f6dd05e58ceff1eb237f1d412b32	2025-12-17 17:42:49.264152+01	20251217164249_add_dice_rolls	\N	\N	2025-12-17 17:42:49.249357+01	1
333acd72-b7fc-469c-a1d7-b0ace2719e13	aff116b9d55e0cb8124f8f71ba200ef32001788fe9fcf3729a18bdece356f1c4	2025-12-18 18:15:31.104929+01	20251218171531_add_tactical_map	\N	\N	2025-12-18 18:15:31.090621+01	1
\.


--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assets (id, name, filename, url, type, category, size, "gameId", "uploaderId", "createdAt", "updatedAt") FROM stdin;
6914253e-81d7-4684-8d56-b6546a7ce338	broadsword.png	broadsword-1765836375608-20042604.png	/uploads/8009133d-c68a-418f-a58e-2eadf4c8c192/broadsword-1765836375608-20042604.png	image/png	image	18374	8009133d-c68a-418f-a58e-2eadf4c8c192	28011ce3-691a-4355-a724-eee67c4452ac	2025-12-15 22:06:15.612	2025-12-15 22:06:15.612
764790ba-4cae-4861-9788-8527f551f597	goblin-giant.png	goblin-giant-1765905673582-573295903.png	/uploads/8009133d-c68a-418f-a58e-2eadf4c8c192/goblin-giant-1765905673582-573295903.png	image/png	image	141483	8009133d-c68a-418f-a58e-2eadf4c8c192	28011ce3-691a-4355-a724-eee67c4452ac	2025-12-16 17:21:13.587	2025-12-16 17:21:13.587
\.


--
-- Name: Animation Animation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Animation"
    ADD CONSTRAINT "Animation_pkey" PRIMARY KEY (id);


--
-- Name: Character Character_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Character"
    ADD CONSTRAINT "Character_pkey" PRIMARY KEY (id);


--
-- Name: CustomModel CustomModel_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CustomModel"
    ADD CONSTRAINT "CustomModel_pkey" PRIMARY KEY (id);


--
-- Name: DiceRoll DiceRoll_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DiceRoll"
    ADD CONSTRAINT "DiceRoll_pkey" PRIMARY KEY (id);


--
-- Name: GamePlayer GamePlayer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GamePlayer"
    ADD CONSTRAINT "GamePlayer_pkey" PRIMARY KEY (id);


--
-- Name: Game Game_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Game"
    ADD CONSTRAINT "Game_pkey" PRIMARY KEY (id);


--
-- Name: TacticalMap TacticalMap_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TacticalMap"
    ADD CONSTRAINT "TacticalMap_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: DiceRoll_gameId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DiceRoll_gameId_idx" ON public."DiceRoll" USING btree ("gameId");


--
-- Name: DiceRoll_gameId_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DiceRoll_gameId_userId_idx" ON public."DiceRoll" USING btree ("gameId", "userId");


--
-- Name: DiceRoll_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DiceRoll_userId_idx" ON public."DiceRoll" USING btree ("userId");


--
-- Name: GamePlayer_gameId_playerId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "GamePlayer_gameId_playerId_key" ON public."GamePlayer" USING btree ("gameId", "playerId");


--
-- Name: TacticalMap_gameId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TacticalMap_gameId_idx" ON public."TacticalMap" USING btree ("gameId");


--
-- Name: TacticalMap_gameId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "TacticalMap_gameId_key" ON public."TacticalMap" USING btree ("gameId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: assets_gameId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "assets_gameId_idx" ON public.assets USING btree ("gameId");


--
-- Name: assets_uploaderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "assets_uploaderId_idx" ON public.assets USING btree ("uploaderId");


--
-- Name: Animation Animation_gameId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Animation"
    ADD CONSTRAINT "Animation_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES public."Game"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Character Character_gameId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Character"
    ADD CONSTRAINT "Character_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES public."Game"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Character Character_modelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Character"
    ADD CONSTRAINT "Character_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES public."CustomModel"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Character Character_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Character"
    ADD CONSTRAINT "Character_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CustomModel CustomModel_gameId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CustomModel"
    ADD CONSTRAINT "CustomModel_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES public."Game"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DiceRoll DiceRoll_gameId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DiceRoll"
    ADD CONSTRAINT "DiceRoll_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES public."Game"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DiceRoll DiceRoll_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DiceRoll"
    ADD CONSTRAINT "DiceRoll_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GamePlayer GamePlayer_gameId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GamePlayer"
    ADD CONSTRAINT "GamePlayer_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES public."Game"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GamePlayer GamePlayer_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GamePlayer"
    ADD CONSTRAINT "GamePlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Game Game_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Game"
    ADD CONSTRAINT "Game_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TacticalMap TacticalMap_gameId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TacticalMap"
    ADD CONSTRAINT "TacticalMap_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES public."Game"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assets assets_gameId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT "assets_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES public."Game"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assets assets_uploaderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT "assets_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict aNrsmMghojnW6R2j0JbM02PEcq1cS6pRgOE9LANUZd9YEmWUTti1XhDpXQSNNQf

