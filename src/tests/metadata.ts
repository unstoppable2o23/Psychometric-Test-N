// Static assessment metadata extracted verbatim from the original HTML test
// sources (upload/Engineering Branch Selector.html, upload/Humanities branch
// Selector.html, upload/ideal career.html). Server-side data for the unified
// test configs. Do not edit by hand — regenerate from the source HTMLs.

export const ENGINEERING_BRANCHES: Record<string, string[]> = {
  'Software Design': [
    'Computer Science Engineering',
    'Information Technology'
  ],
  'Flying and Mechanics': [
    'Aeronautical Engineering'
  ],
  'Manufacturing Research & Practices': [
    'Production Engineering',
    'Manufacturing Engineering'
  ],
  'Application of Electricity & Electronics': [
    'Electrical Engineering',
    'Electronics Engineering',
    'Instrumentation Engineering',
    'Optical Engineering',
    'TeleCommunication Engineering'
  ],
  'Application of Biology': [
    'Biochemical Engineering',
    'Biomedical Engineering',
    'Biotechnology'
  ],
  'Chemical Research': [
    'Chemical Engineering',
    'Nuclear Engineering'
  ],
  'Chemicals Compounds Study': [
    'Plastic Technology',
    'Polymer Technology',
    'Rubber Technology'
  ],
  'Application of Bioprocess': [
    'Leather Technology',
    'Pulp and Paper Engineering',
    'Textile Engineering'
  ],
  'Natural Resources in Water': [
    'Marine Engineering',
    'Naval and Ocean Engineering',
    'Petroleum and Oil Engineering'
  ],
  'Of Surface and Substrates': [
    'Ceramic Engineering',
    'Paint Technology'
  ],
  'Agro Based': [
    'Agriculture Engineering',
    'Food Technology'
  ],
  'Construction and Structures': [
    'Architecture Engineering',
    'Civil Engineering'
  ],
  'Machines & Tools': [
    'Automation and Robotic Engineering',
    'Automobile Engineering',
    'Mechanical Engineering'
  ],
  'Natural Resources on Earth': [
    'Environmental Engineering',
    'Material and Metallurgical Engineering',
    'Mining Engineering'
  ]
}

export const ENGINEERING_SECTORS: Record<string, string[]> = {
  'Digital, Electrical & Aero': [
    'Software Design',
    'Application of Electricity & Electronics',
    'Flying and Mechanics'
  ],
  'Mechanical, Civil & Production': [
    'Machines & Tools',
    'Construction and Structures',
    'Manufacturing Research & Practices'
  ],
  'Chemical, Material & Process': [
    'Chemical Research',
    'Chemicals Compounds Study',
    'Of Surface and Substrates',
    'Application of Bioprocess'
  ],
  'Bio, Agro & Earth/Marine': [
    'Application of Biology',
    'Agro Based',
    'Natural Resources in Water',
    'Natural Resources on Earth'
  ]
}

export const HUMANITIES_PUBLIC_CLUSTERS: string[] = [
  'Teaching and Education Related',
  'Social Service Related',
  'Public Administration Related',
  'Organizing Skills Related',
  'Management Related',
  'Law Related',
  'History Related',
  'Geography Related',
  'Economics Related',
  'Civil Education Related'
]

export const HUMANITIES_CLUSTERS: Record<string, { careers: string[]; work: string }> = {
  "Teaching and Education Related": {
    "careers": [
      "Nursery or Pre-Primary Teacher",
      "Primary, Middle School, Secondary and Senior Secondary Teacher",
      "Lecturer and Professor",
      "Institute Trainer",
      "Tutor",
      "Coaching Centre Trainer",
      "Academic Head or Principal"
    ],
    "work": "Government or private schools, colleges, education companies and NGOs, institutes and coaching centres"
  },
  "Social Service Related": {
    "careers": [
      "Teacher and Professor",
      "Clinical Psychologist",
      "Social Workers",
      "Relationship Counselor",
      "Mental Health Professional",
      "Career Counselor"
    ],
    "work": "Schools, colleges, hospitals, NGOs, government and defense departments, industries, training companies"
  },
  "Public Administration Related": {
    "careers": [
      "Indian Administrative Services",
      "Police",
      "Protective",
      "Revenue",
      "Foreign Services",
      "Railway Services"
    ],
    "work": "Public service departments, State or Central Government departments"
  },
  "Physiology and Sports Related": {
    "careers": [
      "Coach",
      "Player",
      "Physical Educationist",
      "Physiotherapist",
      "Gym Trainer",
      "Yoga Trainer",
      "Alternate Medicine Therapist"
    ],
    "work": "Schools, colleges and training institutes; opportunities to represent at national, state and district level"
  },
  "Organizing Skills Related": {
    "careers": [
      "Librarian",
      "Documentation Officers"
    ],
    "work": "Public and school/college libraries, documentation work in any office"
  },
  "Management Related": {
    "careers": [
      "Human Resource Manager",
      "Operations Manager",
      "Finance Manager",
      "Sales and Marketing Manager"
    ],
    "work": "Specific management jobs in corporations — manufacturing, IT, insurance, banking, services"
  },
  "Mass Media Related": {
    "careers": [
      "Radio and TV Anchoring",
      "News Reading",
      "Theater Stage and Voice Over Artist",
      "Public Relations",
      "Photography",
      "Advertisement",
      "Online Media",
      "Video and Audio Editor",
      "Camera and Light Professional",
      "Sound Technician"
    ],
    "work": "Media and entertainment channels, radio, news channels, magazines, studios and theaters"
  },
  "Law Related": {
    "careers": [
      "Lawyer — Civil, Marital, Family, Corporate, Tax, Criminal and Judge"
    ],
    "work": "Legal firms, State, District, High Court and Supreme Court"
  },
  "Languages Related": {
    "careers": [
      "Linguist",
      "Translator",
      "Interpreter",
      "News Reader",
      "Bilingual Educator",
      "Copy Writer and Editor",
      "Grant and Proposal Writer",
      "Professor",
      "Teacher and Trainer",
      "Public Relations",
      "Publication",
      "Research"
    ],
    "work": "Diplomat assistance services, Investigation Bureau, publishing houses, newspapers and magazines, documentation departments"
  },
  "Journalism": {
    "careers": [
      "Journalist – Print or Electronic",
      "Reporter",
      "Editor",
      "Copy Writer",
      "Screen Play Writer",
      "Content Writer"
    ],
    "work": "Radio, newspapers, magazines, news channels, information blogs and websites"
  },
  "Industrial Design Related": {
    "careers": [
      "Fashion Designer",
      "Textile Designer",
      "Knitwear Designer",
      "Accessory Designer",
      "Jewellery Designer",
      "Interior Designer"
    ],
    "work": "Specific industries for specific roles, teaching in vocational colleges"
  },
  "Hospitality - Travel and Tourism Related": {
    "careers": [
      "Travel Agent",
      "Tourism Manager",
      "Logistics Manager",
      "Transportation Support",
      "Airhostess",
      "Cabin Crew",
      "Customer Service Manager",
      "Travel Desk Officer",
      "Event Manager"
    ],
    "work": "Tourism companies, airlines, cruise ships, travel agencies, government transport departments, amusement parks, hotels, malls"
  },
  "Hospitality - Hotel Industry Related": {
    "careers": [
      "Hotel Manager",
      "Facility Maintenance",
      "Chef",
      "Food and Beverage Specialist",
      "Cleaning and Housekeeping In Charges",
      "Restaurant and Bar In Charge"
    ],
    "work": "Hotels, motels, restaurants, cafes, resorts, cruises and clubs; teaching in hotel management colleges"
  },
  "History Related": {
    "careers": [
      "Historian",
      "Archaeologist",
      "Anthropologist",
      "Museum Curator",
      "History Teacher and Professor"
    ],
    "work": "Schools and colleges, museums, heritage preservation projects, archaeological and anthropological departments"
  },
  "Geography Related": {
    "careers": [
      "Geographer",
      "Teacher and Professor",
      "Cartographer",
      "Surveyors",
      "Urban and Rural Planner",
      "GIS Specialist",
      "Climatologist",
      "Environment Specialist"
    ],
    "work": "Population survey organizations, environmental projects, geological departments, weather forecast departments, schools and colleges"
  },
  "Economics Related": {
    "careers": [
      "Economist",
      "Activist",
      "Reformer",
      "Researcher",
      "Journalist",
      "Investment Advisor and Financial Analyst",
      "Teacher and Professor"
    ],
    "work": "Banks, finance companies, schools and colleges, media, NGOs"
  },
  "Computer Related Designing": {
    "careers": [
      "Web Designer",
      "Graphic Designer",
      "Animator",
      "Game Designer",
      "Illustrator",
      "Multimedia Designer"
    ],
    "work": "IT and technology companies, audio-visual design studios, multimedia and mobile gaming companies"
  },
  "Civil Education Related": {
    "careers": [
      "Activist",
      "Reformer",
      "Researcher",
      "Journalist",
      "Philosopher",
      "Critic and Political Analyst",
      "Teacher and Professor"
    ],
    "work": "News agencies, NGOs, governing bodies, schools and colleges"
  },
  "Beauty Related": {
    "careers": [
      "Beautician",
      "Hair Stylist",
      "Cosmetologist",
      "Life Style Consultant"
    ],
    "work": "Beauty parlors, movie and theater industry, setting up your own enterprise"
  }
}

export const IDEAL_CAREER_MAP: Record<string, { title: string; desc: string; jobs: string[] }> = {
  "R": {
    "title": "Engineering & Technology",
    "desc": "Mechanical, civil, computer engineering, software development, and technical trades.",
    "jobs": [
      "Software Developer",
      "Mechanical Engineer",
      "Civil Engineer",
      "Architect",
      "Pilot",
      "Robotics Technician",
      "Construction Manager",
      "Automotive Engineer"
    ]
  },
  "I": {
    "title": "Science & Research",
    "desc": "Scientific research, laboratory work, data science, and medical analysis.",
    "jobs": [
      "Biologist",
      "Research Scientist",
      "Data Analyst",
      "Chemist",
      "Physicist",
      "Forensic Investigator",
      "Astronomer",
      "Statistician"
    ]
  },
  "A": {
    "title": "Arts, Design & Media",
    "desc": "Creative expression through visual arts, graphic design, writing, and media.",
    "jobs": [
      "Graphic Designer",
      "UX/UI Designer",
      "Author / Writer",
      "Animator",
      "Photographer",
      "Interior Designer",
      "Film Director",
      "Fashion Designer"
    ]
  },
  "S": {
    "title": "Health Science & Social Service",
    "desc": "Healthcare, teaching, counseling, therapy, and community support.",
    "jobs": [
      "Doctor / Physician",
      "Clinical Psychologist",
      "Teacher / Educator",
      "Physical Therapist",
      "Social Worker",
      "Veterinarian",
      "Nurse"
    ]
  },
  "E": {
    "title": "Business & Leadership",
    "desc": "Management, entrepreneurship, marketing, law, and corporate strategy.",
    "jobs": [
      "Business Administrator",
      "Marketing Director",
      "Lawyer",
      "Entrepreneur",
      "Event Manager",
      "Project Leader",
      "Public Relations Manager"
    ]
  },
  "C": {
    "title": "Finance & Administration",
    "desc": "Accounting, banking, financial planning, and organizational operations.",
    "jobs": [
      "Chartered Accountant",
      "Financial Analyst",
      "Banker",
      "Auditor",
      "Data Manager",
      "Logistics Specialist",
      "Compliance Officer"
    ]
  }
}
