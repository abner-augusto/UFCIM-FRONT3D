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
    description: 'Centro das Humanidades, Artes, Letras e Cultura. Abriga a Reitoria e importantes centros como CH, FADIR, FEAAC e FACED.',
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
    description: 'Maior campus em extensão, focado em Ciências Exatas, Tecnologia e Ciências Agrárias.',
  },
  {
    id: 'porangabucu',
    name: 'Campus de Porangabuçu',
    shortName: 'Porangabuçu',
    city: 'Fortaleza',
    neighborhood: 'Porangabuçu',
    buildings: [],
    active: false,
    description: 'Especializado na área da Saúde, abrigando a Faculdade de Medicina, Farmácia, Odontologia e Enfermagem, além do Complexo Hospitalar.',
  },
  {
    id: 'quixada',
    name: 'Campus de Quixadá',
    shortName: 'Quixadá',
    city: 'Quixadá',
    neighborhood: '',
    buildings: [],
    active: false,
    description: 'Referência em Tecnologia da Informação, com cursos de Ciência da Computação, Engenharia de Software, Sistemas de Informação, Redes e Design Digital.',
  },
  {
    id: 'sobral',
    name: 'Campus de Sobral',
    shortName: 'Sobral',
    city: 'Sobral',
    neighborhood: '',
    buildings: [],
    active: false,
    description: 'Foco consolidado nas áreas de Saúde e Tecnologia, oferecendo cursos como Medicina, Odontologia e Engenharias.',
  },
  {
    id: 'russas',
    name: 'Campus de Russas',
    shortName: 'Russas',
    city: 'Russas',
    neighborhood: '',
    buildings: [],
    active: false,
    description: 'Focado em Engenharia e Tecnologia para a região do Vale do Jaguaribe, incluindo Ciência da Computação e Engenharia de Software.',
  },
  {
    id: 'crateus',
    name: 'Campus de Crateús',
    shortName: 'Crateús',
    city: 'Crateús',
    neighborhood: '',
    buildings: [],
    active: false,
    description: 'Atende a região dos Sertões de Crateús com foco em Engenharias (Civil, Ambiental, de Minas), Ciência da Computação e Sistemas de Informação.',
  },
];
