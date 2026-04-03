export interface Campus {
  id: string;
  name: string;
  shortName: string;
  city: string;
  neighborhood: string;
  buildings: string[];
  active: boolean;
  description: string;
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
