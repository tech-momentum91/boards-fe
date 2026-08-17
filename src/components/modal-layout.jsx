import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';

const ModalLayout = ({
  children,
  isOpen,
  onOpenChange,
  title,
  headerIcon,
  description,
  leftBtn,
  leftBtnTxt,
  rightBtn,
  rightBtnTxt,
}) => {
  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header icon={headerIcon} title={title} description={description} />
        <Modal.Body>{children}</Modal.Body>
      </Modal.Content>

      <Modal.Footer />
    </Modal.Root>
  );
};

export default ModalLayout;
