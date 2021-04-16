import React from 'react';
import Layout from '../../layout';
import { Place } from '../../lib/Place';
import { Prefecture } from '../../lib/Prefecture';
import { User } from '../../lib/User';
import { placeQueue, placeTypeLabel, userRoles } from '../../utils/constraints';
import { message, Space, Spin, Table, Typography } from 'antd';
import FormPlace from '../../components/elements/formPlace';
import dayjs from 'dayjs';
import { CheckOutlined, EditOutlined, UploadOutlined } from '@ant-design/icons';
import { PrefectureItem, PrefectureItemHeader } from './styles';
import Button from '../../components/ui/Button';
import logging from '../../utils/logging';
import { createPlace, updatePlace } from '../../utils/firestore';
import ModalUpload from '../../components/elements/modalUpload';
import { API } from '../../utils/api';

type ListViewProps = {
  user: User;
  places: Place[];
  pageLoading: boolean;
  prefectures: Prefecture[];
};

/**
 * List page
 * @params NextPage
 */
const List: React.FC<ListViewProps> = ({ user, prefectures, places, pageLoading }) => {
  const [loading, setLoading] = React.useState<boolean>(false);
  const [modal, setModal] = React.useState<{ open: boolean; prefecture?: Prefecture; place?: Place }>({ open: false });
  const [modalUpload, setModalUpload] = React.useState<{ open: boolean; prefecture?: Prefecture }>({ open: false });

  /**
   * onSubmitForm
   */
  const onSubmitForm = async (data) => {
    setLoading(true);
    try {
      const convertData: Place = {
        ...data,
        internalTitle: data.internalTitle || data.title,
        openAt: dayjs(data.openAt).toDate(),
        closeAt: dayjs(data.closeAt).toDate()
      };
      if (modal.place) {
        await updatePlace(modal.place.id, modal.prefecture.id, convertData);
      } else {
        const place = {
          ...convertData,
          open: true,
          queueStatus: placeQueue.closed,
          prefectureId: modal.prefecture.id
        };
        await createPlace(modal.prefecture.id, place);
      }
      setModal({ open: false });
      message.success(`Ponto de vacinação ${modal.place ? 'atualizado' : 'inserido'} com sucesso`);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      message.error(`Falha ao ${modal.place ? 'atualizar' : 'inserir'} ponto de vacinação`);
      logging.error('Error submitting place', { err, data });
    }
  };

  /**
   * onSubmitUpload
   */
  const onSubmitUpload = async (data) => {
    setLoading(true);
    try {
      const response = await API.post('/import-places', { ...data, prefectureId: modalUpload.prefecture.id });
      if (response.status === 200) {
        message.success('Arquivo enviado com sucesso!');
        setModalUpload({ open: false });
      }
      setLoading(false);
    } catch (err) {
      logging.error('Error uploading csv file: ', { data, err });
      message.error('Houve um problema ao enviar o arquivo');
      setLoading(false);
    }
  };

  /**
   * formatDate
   */
  const formatDate = ({ seconds }) => dayjs(new Date(seconds * 1000)).format('HH:mm');
  const columns = [
    {
      title: 'Ponto',
      dataIndex: 'title',
      key: 'title'
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      /**
       * render
       */
      render: (value) => placeTypeLabel[value]
    },
    {
      title: 'Abre hoje',
      dataIndex: 'openToday',
      key: 'openToday',
      /**
       * render
       */
      render: (_, record: Place) => (record.openToday ? <CheckOutlined /> : null)
    },
    {
      title: 'Abre amanhã',
      dataIndex: 'openTomorrow',
      key: 'openTomorrow',
      /**
       * render
       */
      render: (_, record: Place) => (record.openTomorrow ? <CheckOutlined /> : null)
    },
    {
      title: 'Horário',
      dataIndex: 'schedule',
      key: 'schedule',
      /**
       * render
       */
      render: (_, record: Place) =>
        `de ${record.openAt ? formatDate(record.openAt) : ''} até ${record.closeAt ? formatDate(record.closeAt) : ''}`
    },
    {
      title: 'Ativo',
      dataIndex: 'active',
      key: 'active',
      /**
       * render
       */
      render: (_, record: Place) => (record.active ? <CheckOutlined /> : null)
    },
    {
      title: '',
      key: 'action',
      width: 200,
      /**
       * render
       */
      render: (_, record: Place) => (
        <Space size="middle">
          <a
            onClick={() =>
              setModal({ open: true, prefecture: prefectures.find((f) => f.id === record.prefectureId), place: record })
            }
          >
            <EditOutlined style={{ marginRight: 8 }} />
            Editar
          </a>
        </Space>
      )
    }
  ];

  return (
    <Layout userRole={user.role} user={user}>
      <FormPlace
        open={modal.open}
        setOpen={setModal}
        loading={loading}
        onSubmit={onSubmitForm}
        place={modal.place}
        defaultCity={modal.prefecture?.city}
        defaultState={modal.prefecture?.state}
      />
      <ModalUpload
        loading={loading}
        open={modalUpload.open}
        setOpen={setModalUpload}
        onSubmit={onSubmitUpload}
        prefecture={modalUpload.prefecture}
      />
      <Spin size="large" spinning={pageLoading} style={{ marginTop: 36 }}>
        {(prefectures || []).map((prefecture) => (
          <PrefectureItem key={prefecture.id}>
            <PrefectureItemHeader>
              <Typography.Title level={4}>{prefecture.name}</Typography.Title>
              <Space size="middle">
                {!!(user.role === userRoles.prefectureAdmin || user.role === userRoles.superAdmin) && (
                  <Button onClick={() => setModalUpload({ open: true, prefecture })}>
                    <UploadOutlined />
                    importar CSV
                  </Button>
                )}
                <Button type="primary" onClick={() => setModal({ open: true, prefecture })}>
                  Novo Ponto
                </Button>
              </Space>
            </PrefectureItemHeader>
            <Table pagination={false} columns={columns} dataSource={places} />
          </PrefectureItem>
        ))}
      </Spin>
    </Layout>
  );
};

export default List;
