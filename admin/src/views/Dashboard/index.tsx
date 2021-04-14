import React from 'react';
import PlaceQueue from '../../components/elements/PlaceQueue';
import Layout from '../../layout';
import { Place } from '../../lib/Place';
import { Prefecture } from '../../lib/Prefecture';
import { User } from '../../lib/User';
import { userRoleType, userRoles } from '../../utils/constraints';
import { Spin } from 'antd';

type DashboardViewProps = {
  userRole: userRoleType;
  user: User;
  places: Place[];
  pageLoading: boolean;
  prefecture: Prefecture;
};

/**
 * Dashboard page
 * @params NextPage
 */
const Dashboard: React.FC<DashboardViewProps> = ({ userRole, user, prefecture, places, pageLoading }) => {
  return (
    <Layout userRole={userRole}>
      <Spin size="large" spinning={pageLoading}>
        {!!(userRole === userRoles.queueObserver || userRole === userRoles.placeAdmin) && (
          <PlaceQueue userRole={userRole} prefecture={prefecture} user={user} places={places} />
        )}
      </Spin>
    </Layout>
  );
};

export default Dashboard;
