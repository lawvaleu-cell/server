/**
 * RA9MANA DZ — Product configuration
 * ------------------------------------------------------------
 * This is the single source of truth for every product shown on the
 * showcase site. To add a new product, add a new object to this array.
 * No other file needs to change for a new product to appear in the
 * "Ecosystem" and "Products" sections.
 *
 * `url` should point to the product's own independent domain.
 * Use "#" while a product's domain is not live yet and set
 * `status: "soon"` — the site will show a "Coming soon" badge and
 * will not attempt to navigate away.
 */

const RA9MANA_PRODUCTS = [
  {
    id: "clinic-manager",
    category: "medical",
    status: "live",
    icon: "medical",
    name: {
      fr: "Clinic Manager",
      en: "Clinic Manager",
      ar: "Clinic Manager"
    },
    description: {
      fr: "Gérez votre cabinet depuis un espace moderne : rendez-vous, dossiers patients et suivi, sans papier.",
      en: "Run your practice from one modern workspace: appointments, patient records and follow-up, paper-free.",
      ar: "أدر عيادتك من مساحة عمل عصرية واحدة: المواعيد وملفات المرضى والمتابعة، دون أي أوراق."
    },
    benefit: {
      fr: "Moins de temps administratif, plus de temps pour les patients.",
      en: "Less administrative time, more time for patients.",
      ar: "وقت إداري أقل، ووقت أكبر للمرضى."
    },
    image: "assets/products/medical.svg",
    url: "https://ra9mana-clinic-pro.onrender.com/"
  },
  {
    id: "school-suite",
    category: "education",
    status: "soon",
    icon: "education",
    name: {
      fr: "School Suite",
      en: "School Suite",
      ar: "School Suite"
    },
    description: {
      fr: "Une plateforme unique pour la scolarité : inscriptions, emplois du temps, notes et communication avec les familles.",
      en: "One platform for school life: enrollment, timetables, grades and communication with families.",
      ar: "منصة واحدة للحياة المدرسية: التسجيل والجدول الزمني والعلامات والتواصل مع الأولياء."
    },
    benefit: {
      fr: "Un établissement mieux coordonné, du bureau à la salle de classe.",
      en: "A better-coordinated institution, from the front office to the classroom.",
      ar: "مؤسسة أكثر تنسيقاً، من الإدارة إلى القسم."
    },
    image: "assets/products/education.svg",
    url: "#"
  },
  {
    id: "resto-manager",
    category: "restaurant",
    status: "soon",
    icon: "restaurant",
    name: {
      fr: "Resto Manager",
      en: "Resto Manager",
      ar: "Resto Manager"
    },
    description: {
      fr: "Commandes, cuisine, salle et stock réunis dans un seul outil pensé pour le rythme d'un restaurant.",
      en: "Orders, kitchen, floor and stock brought together in one tool built for a restaurant's pace.",
      ar: "الطلبات والمطبخ والصالة والمخزون في أداة واحدة مصممة لإيقاع المطعم."
    },
    benefit: {
      fr: "Un service plus fluide, aux heures de pointe comme au calme.",
      en: "Smoother service, at peak hours and quiet ones alike.",
      ar: "خدمة أكثر سلاسة، في أوقات الذروة كما في الهدوء."
    },
    image: "assets/products/restaurant.svg",
    url: "#"
  },
  {
    id: "cardx-pro",
    category: "business",
    status: "live",
    icon: "business",
    name: {
      fr: "CardX Pro",
      en: "CardX Pro",
      ar: "CardX Pro"
    },
    description: {
      fr: "Cartes de visite digitales et API : créez, partagez et gérez des cartes de visite numériques en quelques secondes.",
      en: "Digital business cards and API: create, share and manage digital business cards in seconds.",
      ar: "بطاقات عمل رقمية وواجهة API: أنشئ وشارك وأدر بطاقات العمل الرقمية في ثوانٍ."
    },
    benefit: {
      fr: "Une identité professionnelle moderne, accessible partout, sans papier.",
      en: "A modern professional identity, accessible everywhere, paper-free.",
      ar: "هوية مهنية عصرية، متاحة في كل مكان، دون أي ورق."
    },
    image: "assets/products/business.svg",
    url: "https://cardx-pro.onrender.com/"
  },
  {
    id: "botdz",
    category: "business",
    status: "live",
    icon: "business",
    name: {
      fr: "BotDZ",
      en: "BotDZ",
      ar: "BotDZ"
    },
    description: {
      fr: "Un chatbot intelligent pour répondre à vos clients et automatiser vos échanges, 24h/24.",
      en: "A smart chatbot to answer your customers and automate your conversations, around the clock.",
      ar: "روبوت محادثة ذكي للرد على عملائك وأتمتة تواصلك على مدار الساعة."
    },
    benefit: {
      fr: "Une présence disponible en permanence, sans effort supplémentaire.",
      en: "An always-available presence, with no extra effort.",
      ar: "حضور دائم ومتاح، دون أي جهد إضافي."
    },
    image: "assets/products/business.svg",
    url: "https://botdz-3mpg.onrender.com/"
  }
];

// Categories shown in the "Ecosystem" overview section — each links to the
// primary product configured above for that sector.
const RA9MANA_CATEGORIES = [
  { id: "medical", icon: "medical", titleKey: "ecosystem.categoryMedical", descKey: "ecosystem.categoryMedicalDesc" },
  { id: "education", icon: "education", titleKey: "ecosystem.categoryEducation", descKey: "ecosystem.categoryEducationDesc" },
  { id: "restaurant", icon: "restaurant", titleKey: "ecosystem.categoryRestaurant", descKey: "ecosystem.categoryRestaurantDesc" },
  { id: "business", icon: "business", titleKey: "ecosystem.categoryBusiness", descKey: "ecosystem.categoryBusinessDesc" }
];
