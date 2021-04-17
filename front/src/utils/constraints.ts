export const placeQueueLabel = {
  open: 'Aberto',
  closed: 'Fechado',
  noQueue: 'Sem fila',
  smallQueue: 'Pouca fila',
  mediumQueue: 'Filas moderadas',
  longQueue: 'Filas intensas'
};

export type placeQueueStatusType = 'open' | 'closed' | 'noQueue' | 'smallQueue' | 'mediumQueue' | 'longQueue';

export const placeQueue: { [key: string]: placeQueueStatusType } = {
  open: 'open',
  closed: 'closed',
  noQueue: 'noQueue',
  smallQueue: 'smallQueue',
  mediumQueue: 'mediumQueue',
  longQueue: 'longQueue'
};

export const placeType = {
  fixed: 'fixed',
  driveThru: 'driveThru'
};

export const placeTypeLabel = {
  fixed: 'Ponto Fixo',
  driveThru: 'Drive thru'
};

export const placeQueueColor = {
  open: '#16a085',
  closed: '#879395',
  noQueue: '#06a555',
  smallQueue: '#E3C153',
  mediumQueue: '#ED902C',
  longQueue: '#A71319'
};
