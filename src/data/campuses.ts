export interface Department {
  id: string;
  name: string;
  shortName: string;
  description: string;
  active: boolean;
}

export interface Campus {
  id: string;
  name: string;
  shortName: string;
  city: string;
  neighborhood: string;
  buildings: string[];
  active: boolean;
  description: string;
  departments?: Department[];
}

export const campuses: Campus[] = [
  {
    id: 'benfica',
    name: 'Campus do Benfica',
    shortName: 'Benfica',
    city: 'Fortaleza',
    neighborhood: 'Benfica',
    buildings: ['Instituto de Arquitetura e Design (IAUD)'],
    active: true,
    description: 'Instituto de Arquitetura e Design da UFC',
    departments: [
      {
        id: 'iaud',
        name: 'Instituto de Arquitetura e Design',
        shortName: 'IAUD',
        description: 'Cursos de Arquitetura e Urbanismo e Design',
        active: true,
      },
      {
        id: 'faced',
        name: 'Faculdade de Educação',
        shortName: 'FACED',
        description: 'Cursos de licenciatura e pedagogia',
        active: false,
      },
      {
        id: 'feaac',
        name: 'Faculdade de Economia, Administração, Atuária e Contabilidade',
        shortName: 'FEAAC',
        description: 'Economia, Administração, Atuária e Contabilidade',
        active: false,
      },
      {
        id: 'fadir',
        name: 'Faculdade de Direito',
        shortName: 'FADIR',
        description: 'Curso de Direito',
        active: false,
      },
      {
        id: 'humanidades',
        name: 'Centro de Humanidades',
        shortName: 'Centro de Humanidades',
        description: 'Ciências Sociais, Filosofia, Psicologia e História',
        active: false,
      },
    ],
  },
  {
    id: 'pici',
    name: 'Campus do Pici',
    shortName: 'Pici',
    city: 'Fortaleza',
    neighborhood: 'Pici',
    buildings: [],
    active: false,
    description: 'Campus principal com centros de Ciências, Tecnologia e Agronomia',
  },
  {
    id: 'porangabucu',
    name: 'Campus de Porangabuçu',
    shortName: 'Porangabuçu',
    city: 'Fortaleza',
    neighborhood: 'Porangabuçu',
    buildings: [],
    active: false,
    description: 'Faculdade de Medicina e Hospital Universitário',
  },
  {
    id: 'quixada',
    name: 'Campus de Quixadá',
    shortName: 'Quixadá',
    city: 'Quixadá',
    neighborhood: '',
    buildings: [],
    active: false,
    description: 'Campus de Ciência da Computação e Design Digital',
  },
  {
    id: 'sobral',
    name: 'Campus de Sobral',
    shortName: 'Sobral',
    city: 'Sobral',
    neighborhood: '',
    buildings: [],
    active: false,
    description: 'Engenharias e Ciências da Saúde',
  },
  {
    id: 'russas',
    name: 'Campus de Russas',
    shortName: 'Russas',
    city: 'Russas',
    neighborhood: '',
    buildings: [],
    active: false,
    description: 'Engenharias e Ciência da Computação',
  },
  {
    id: 'crateus',
    name: 'Campus de Crateús',
    shortName: 'Crateús',
    city: 'Crateús',
    neighborhood: '',
    buildings: [],
    active: false,
    description: 'Sistemas de Informação e Engenharia Civil',
  },
];
