/**
 * RA9MANA DZ — Legal Library: embedded fallback data
 * ------------------------------------------------------------
 * Mirrors data/library.json (the source of truth, editable by the local
 * admin export). Embedded here so the library still renders when the
 * site is opened directly from disk (file://), where fetch() of a local
 * JSON file is blocked by the browser. js/library-common.js tries
 * data/library.json first and falls back to this array automatically.
 * If you edit data/library.json by hand, mirror the change here too
 * (the local admin's export keeps both in sync for you).
 */

const RA9MANA_LIBRARY_FALLBACK = [
  {
    "id": "droit-numerique-algerie-2026-a1b2",
    "title": "Le droit du numérique en Algérie : état des lieux et perspectives",
    "author": "Amina Cherfaoui",
    "type": "master_thesis",
    "typeLabel": "Mémoire de Master",
    "category": "القانون الرقمي",
    "year": 2025,
    "language": "fr",
    "university": "Université Alger 1",
    "country": "Algérie",
    "description": "Une étude approfondie du cadre juridique algérien encadrant les activités numériques : protection des données, commerce électronique et responsabilité des plateformes.",
    "keywords": [
      "droit numérique",
      "protection des données",
      "cybersécurité"
    ],
    "cover": "",
    "pdf": "",
    "source": "",
    "contributor": {
      "name": "Amina Cherfaoui",
      "bio": "",
      "photo": "",
      "showName": true,
      "showPhoto": false,
      "showBio": false,
      "links": {
        "website": "",
        "linkedin": "",
        "facebook": "",
        "instagram": "",
        "x": "",
        "github": ""
      }
    },
    "status": "published",
    "createdAt": "2026-01-14"
  },
  {
    "id": "qanoun-madani-djazairi-c3d4",
    "title": "شرح القانون المدني الجزائري - الالتزامات",
    "author": "بلقاسم حاجي",
    "type": "book",
    "typeLabel": "كتاب",
    "category": "القانون المدني",
    "year": 2022,
    "language": "ar",
    "university": "",
    "country": "الجزائر",
    "description": "مرجع شامل يشرح أحكام الالتزامات في القانون المدني الجزائري مع أمثلة تطبيقية واجتهادات قضائية حديثة.",
    "keywords": [
      "القانون المدني",
      "الالتزامات",
      "العقود"
    ],
    "cover": "",
    "pdf": "",
    "source": "",
    "contributor": {
      "name": "",
      "bio": "",
      "photo": "",
      "showName": false,
      "showPhoto": false,
      "showBio": false,
      "links": {
        "website": "",
        "linkedin": "",
        "facebook": "",
        "instagram": "",
        "x": "",
        "github": ""
      }
    },
    "status": "published",
    "createdAt": "2026-02-02"
  },
  {
    "id": "commercial-arbitration-mena-e5f6",
    "title": "Commercial Arbitration Trends in North Africa",
    "author": "Yasmine Belkacemi",
    "type": "scientific_article",
    "typeLabel": "Scientific Article",
    "category": "القانون التجاري",
    "year": 2024,
    "language": "en",
    "university": "",
    "country": "Algérie",
    "description": "An analysis of recent developments in commercial arbitration practice across North African jurisdictions, with a focus on enforcement of foreign awards.",
    "keywords": [
      "arbitration",
      "commercial law",
      "enforcement"
    ],
    "cover": "",
    "pdf": "",
    "source": "",
    "contributor": {
      "name": "Yasmine Belkacemi",
      "bio": "Doctorante en droit des affaires.",
      "photo": "",
      "showName": true,
      "showPhoto": false,
      "showBio": true,
      "links": {
        "website": "",
        "linkedin": "",
        "facebook": "",
        "instagram": "",
        "x": "",
        "github": ""
      }
    },
    "status": "published",
    "createdAt": "2026-03-11"
  },
  {
    "id": "qanoun-asasi-2020-g7h8",
    "title": "التعديل الدستوري 2020",
    "author": "الجريدة الرسمية للجمهورية الجزائرية",
    "type": "law",
    "typeLabel": "قانون",
    "category": "القانون الدستوري",
    "year": 2020,
    "language": "ar",
    "university": "",
    "country": "الجزائر",
    "description": "النص الكامل للتعديل الدستوري الصادر سنة 2020، متضمنًا الأحكام العامة والتنظيم المؤسساتي للدولة الجزائرية.",
    "keywords": [
      "الدستور",
      "التعديل الدستوري",
      "المؤسسات"
    ],
    "cover": "",
    "pdf": "",
    "source": "الجريدة الرسمية",
    "contributor": {
      "name": "",
      "bio": "",
      "photo": "",
      "showName": false,
      "showPhoto": false,
      "showBio": false,
      "links": {
        "website": "",
        "linkedin": "",
        "facebook": "",
        "instagram": "",
        "x": "",
        "github": ""
      }
    },
    "status": "published",
    "createdAt": "2026-01-05"
  },
  {
    "id": "mursoum-tanfidhi-electronique-i9j0",
    "title": "مرسوم تنفيذي يتعلق بالتوقيع الإلكتروني",
    "author": "الجريدة الرسمية للجمهورية الجزائرية",
    "type": "executive_decree",
    "typeLabel": "مرسوم تنفيذي",
    "category": "القانون الرقمي",
    "year": 2021,
    "language": "ar",
    "university": "",
    "country": "الجزائر",
    "description": "مرسوم تنفيذي يحدد شروط وكيفيات استعمال التوقيع الإلكتروني في المعاملات الإدارية والتجارية.",
    "keywords": [
      "التوقيع الإلكتروني",
      "المعاملات الرقمية"
    ],
    "cover": "",
    "pdf": "",
    "source": "الجريدة الرسمية",
    "contributor": {
      "name": "",
      "bio": "",
      "photo": "",
      "showName": false,
      "showPhoto": false,
      "showBio": false,
      "links": {
        "website": "",
        "linkedin": "",
        "facebook": "",
        "instagram": "",
        "x": "",
        "github": ""
      }
    },
    "status": "published",
    "createdAt": "2026-02-20"
  },
  {
    "id": "these-doctorat-environnement-k1l2",
    "title": "La protection juridique de l'environnement en droit algérien",
    "author": "Sofiane Meddahi",
    "type": "phd_thesis",
    "typeLabel": "Thèse de doctorat",
    "category": "القانون البيئي",
    "year": 2023,
    "language": "fr",
    "university": "Université d'Oran 2",
    "country": "Algérie",
    "description": "Une analyse critique des mécanismes juridiques de protection de l'environnement en droit algérien, comparés aux standards internationaux.",
    "keywords": [
      "droit de l'environnement",
      "développement durable"
    ],
    "cover": "",
    "pdf": "",
    "source": "",
    "contributor": {
      "name": "Sofiane Meddahi",
      "bio": "",
      "photo": "",
      "showName": true,
      "showPhoto": false,
      "showBio": false,
      "links": {
        "website": "",
        "linkedin": "",
        "facebook": "",
        "instagram": "",
        "x": "",
        "github": ""
      }
    },
    "status": "published",
    "createdAt": "2026-03-28"
  },
  {
    "id": "ijtihad-qada-usra-m3n4",
    "title": "اجتهادات قضائية في قضايا الأسرة",
    "author": "المجلس الأعلى للقضاء",
    "type": "case_law",
    "typeLabel": "اجتهاد قضائي",
    "category": "قانون الأسرة",
    "year": 2024,
    "language": "ar",
    "university": "",
    "country": "الجزائر",
    "description": "مجموعة مختارة من الاجتهادات القضائية الصادرة في قضايا الأسرة، مع تحليل موجز للحيثيات القانونية.",
    "keywords": [
      "قانون الأسرة",
      "الاجتهاد القضائي"
    ],
    "cover": "",
    "pdf": "",
    "source": "",
    "contributor": {
      "name": "",
      "bio": "",
      "photo": "",
      "showName": false,
      "showPhoto": false,
      "showBio": false,
      "links": {
        "website": "",
        "linkedin": "",
        "facebook": "",
        "instagram": "",
        "x": "",
        "github": ""
      }
    },
    "status": "published",
    "createdAt": "2026-04-02"
  },
  {
    "id": "guide-creation-entreprise-o5p6",
    "title": "Guide pratique de la création d'entreprise en Algérie",
    "author": "Karim Ait Ouali",
    "type": "guide",
    "typeLabel": "Guide",
    "category": "القانون التجاري",
    "year": 2025,
    "language": "fr",
    "university": "",
    "country": "Algérie",
    "description": "Un guide étape par étape des formalités juridiques et administratives nécessaires à la création d'une entreprise en Algérie.",
    "keywords": [
      "création d'entreprise",
      "formalités administratives"
    ],
    "cover": "",
    "pdf": "",
    "source": "",
    "contributor": {
      "name": "Karim Ait Ouali",
      "bio": "Consultant juridique.",
      "photo": "",
      "showName": true,
      "showPhoto": false,
      "showBio": true,
      "links": {
        "website": "",
        "linkedin": "",
        "facebook": "",
        "instagram": "",
        "x": "",
        "github": ""
      }
    },
    "status": "published",
    "createdAt": "2026-04-18"
  }
];
