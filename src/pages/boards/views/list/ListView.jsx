import BoardTaskView from '../shared/BoardTaskView';

export default function ListView(props) {
  return <BoardTaskView {...props} layoutMode='list' />;
}
