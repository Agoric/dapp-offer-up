import { useEffect, useState } from 'react';
import {
  makeAgoricChainStorageWatcher,
  AgoricChainStoragePathKind as Kind,
} from '@agoric/rpc';
import { create } from 'zustand';
import {
  makeAgoricWalletConnection,
  suggestChain,
} from '@agoric/web-components';
import { UserCircle, Wallet, Activity, Heart } from 'lucide-react';

const ENDPOINTS = {
  RPC: 'http://localhost:26657',
  API: 'http://localhost:1317',
};

const watcher = makeAgoricChainStorageWatcher(ENDPOINTS.API, 'agoriclocal');

interface AppState {
  wallet?: any;
  patientContractInstance?: unknown;
  brands?: Record<string, unknown>;
}

const useAppStore = create<AppState>(() => ({}));

const setup = async () => {
  watcher.watchLatest<Array<[string, unknown]>>(
    [Kind.Data, 'published.agoricNames.instance'],
    instances => {
      useAppStore.setState({
        patientContractInstance: instances
          .find(([name]) => name === 'patientData')!
          .at(1),
      });
    },
  );

  watcher.watchLatest<Array<[string, unknown]>>(
    [Kind.Data, 'published.agoricNames.brand'],
    brands => {
      useAppStore.setState({
        brands: Object.fromEntries(brands),
      });
    },
  );
};

const connectWallet = async () => {
  await suggestChain('https://local.agoric.net/network-config');
  const wallet = await makeAgoricWalletConnection(watcher, ENDPOINTS.RPC);
  useAppStore.setState({ wallet });
};

const publishPatientData = (patientData: any) => {
  const { wallet, patientContractInstance } = useAppStore.getState();
  if (!patientContractInstance) throw Error('no contract instance');

  wallet?.makeOffer(
    {
      source: 'contract',
      instance: patientContractInstance,
      publicInvitationMaker: 'makePublishInvitation',
    },
    {}, // No assets being exchanged
    {
      patientData,
    },
    (update: { status: string; data?: unknown }) => {
      if (update.status === 'error') {
        alert(`Publication error: ${update.data}`);
      }
      if (update.status === 'accepted') {
        alert('Data published successfully');
      }
      if (update.status === 'refunded') {
        alert('Publication rejected');
      }
    },
  );
};

const PatientDataForm = () => {
  const [formData, setFormData] = useState({
    patientId: 'PAT-2024-001',
    name: 'John Doe',
    age: '30',
    gender: 'male',
    bloodType: 'O+',
    allergies: 'None reported',
    medications: 'No current medications',
    lastVisit: '2024-03-15',
    primaryDoctor: 'Dr. Sarah Smith',
    emergencyContact: '+1 (555) 123-4567',
  });

  useEffect(() => {
    setup();
  }, []);

  const { wallet } = useAppStore(({ wallet }) => ({
    wallet,
  }));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    publishPatientData(formData);
  };

  const tryConnectWallet = () => {
    connectWallet().catch(err => {
      switch (err.message) {
        case 'KEPLR_CONNECTION_ERROR_NO_SMART_WALLET':
          alert('No smart wallet at that address');
          break;
        default:
          alert(err.message);
      }
    });
  };

  return (
    <div className="app-container">
      <div className="form-container">
        {/* Header */}
        <div className="header">
          <div className="header-content">
            <div className="title-section">
              <Activity className="icon" />
              <h1 className="title">Patient Data Management</h1>
            </div>
            <button
              onClick={tryConnectWallet}
              className="wallet-button"
            >
              <Wallet className="icon" />
              <span>{wallet?.address ? 'Connected' : 'Connect Wallet'}</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="form">
          {/* Personal Information */}
          <div className="section">
            <div className="section-header">
              
              <h2 className="section-title">Personal Information <UserCircle className="icon" /> </h2>
            </div>
            <div className="field-grid">
              {/* Patient ID */}
              <div className="field">
                <label className="label">Patient ID </label>
                <input
                  type="text"
                  name="patientId"
                  value={formData.patientId}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </div>
              {/* Full Name */}
              <div className="field">
                <label className="label">Full Name </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </div>
              {/* Primary Doctor */}
              <div className="field">
                <label className="label">Primary Doctor </label>
                <input
                  type="text"
                  name="primaryDoctor"
                  value={formData.primaryDoctor}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="section">
            <div className="section-header">
              
              <h2 className="section-title"> Medical Information <Heart className="icon" /> </h2>
            </div>
            <div className="field-grid">
              {/* Age */}
              <div className="field">
                <label className="label">Age </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </div>
              {/* Blood Type */}
              <div className="field">
                <label className="label">Blood Type </label>
                <input
                  type="text"
                  name="bloodType"
                  value={formData.bloodType}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </div>
              {/* Gender */}
              <div className="field">
                <label className="label">Gender </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="input"
                  required
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {/* Last Visit Date */}
              <div className="field">
                <label className="label">Last Visit Date </label>
                <input
                  type="date"
                  name="lastVisit"
                  value={formData.lastVisit}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="field-grid">
            {/* Allergies */}
            <div className="field">
              <label className="label">Allergies </label>
              <textarea
                name="allergies"
                value={formData.allergies}
                onChange={handleInputChange}
                className="textarea"
                rows={4}
              />
            </div>
            {/* Current Medications */}
            <div className="field">
              <label className="label">Current Medications </label>
              <textarea
                name="medications"
                value={formData.medications}
                onChange={handleInputChange}
                className="textarea"
                rows={4}
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="field">
            <label className="label">Emergency Contact </label>
            <input
              type="text"
              name="emergencyContact"
              value={formData.emergencyContact}
              onChange={handleInputChange}
              className="input"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`submit-button ${!wallet ? 'disabled' : ''}`}
            disabled={!wallet}
          >
            <Activity className="icon" />
            <span>Publish Patient Data</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default PatientDataForm;
