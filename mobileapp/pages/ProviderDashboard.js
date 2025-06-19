import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Animated, Modal, Linking, ScrollView, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import { getProfile, postJob, searchJobs, updateProviderProfile, searchSeekers, getApplicants, updateJob, deleteJob, changeJobAvailibility } from '../utils/api';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function ProviderDashboard({ isDarkMode, toggleDarkMode, route }) {
  const [user, setUser] = useState(route?.params?.user || null);
  const [jobTitle, setJobTitle] = useState('');
  const [skills, setSkills] = useState('');
  const [experienceRequired, setExperienceRequired] = useState('');
  const [showSeekerProfileModal, setShowSeekerProfileModal] = useState(false);
  const [location, setLocation] = useState('');
  const [maxCTC, setMaxCTC] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('');
  const [seekerQuery, setSeekerQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [seekers, setSeekers] = useState([]);
  const [message, setMessage] = useState('');
  const [postedJobs, setPostedJobs] = useState([]);
  const [selectedJobForDelete, setSelectedJobForDelete] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const[showDeleteJobModal, setShowDeleteJobModal] = useState(false);
  const [selectedSeekerId, setSelectedSeekerId] = useState(null);
  const [selectedJobForEdit, setSelectedJobForEdit] = useState(null);
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [jobFilter, setJobFilter] = useState('All');
  const navigation = useNavigation();
  const [postScale] = useState(new Animated.Value(1));
  const [searchScale] = useState(new Animated.Value(1));
  const [profileScale] = useState(new Animated.Value(1));
  const [logoutScale] = useState(new Animated.Value(1));
  const [connectScales, setConnectScales] = useState({});
  const [downloadScale] = useState(new Animated.Value(1));
  const [editJobScale] = useState(new Animated.Value(1));
  const [deleteJobScale] = useState(new Animated.Value(1));

 useEffect(() => {
  if (!route?.params?.contact && !user) {
    navigation.navigate('AuthForm', { role: 'provider' });
    return;
  }
  fetchData();
}, [route, navigation]);

const fetchData = async () => {
  try {
    let fetchedUser = user;

    // Fetch profile if not already loaded
    if (!user) {
      const isEmail = route.params.contact.includes('@');
      const response = await getProfile({
        role: 'provider',
        ...(isEmail
          ? { email: route.params.contact }
          : { whatsappNumber: route.params.contact }),
      });
      fetchedUser = response.data;
      setUser(fetchedUser); // Save to state
    }

    // Always use fetchedUser to avoid relying on possibly stale state
    const jobsResponse = await searchJobs({ postedBy: fetchedUser._id });
    console.log('📄 Jobs posted by you:', jobsResponse.data);
    setPostedJobs(jobsResponse.data);

    const applicantsResponse = await getApplicants(fetchedUser._id);
    setApplicants(applicantsResponse.data);

    const scales = {};
    applicantsResponse.data.forEach(applicant => {
      scales[applicant._id] = new Animated.Value(1);
    });
    setConnectScales(scales);

  } catch (error) {
    console.error('❌ Error fetching provider dashboard data:', error);
    Alert.alert('Error', 'Failed to fetch data: ' + (error?.message || 'Unknown error'));
  }
};


  const handlePostJob = async () => {
    const jobData = {
      skills: skills.split(',').map(s => s.trim()),
      experienceRequired: parseInt(experienceRequired) || 0,
      location,
      maxCTC: parseInt(maxCTC) || 0,
      noticePeriod,
      postedBy: { _id: user?._id },
    };

    console.log('Job Data:', jobData);

    try {
      const response = await postJob(jobData);
      Alert.alert('Success', 'Job posted successfully');
      console.log('Job created successfully:', response);
      setSkills('');
      setExperienceRequired('');
      setLocation('');
      setMaxCTC('');
      setNoticePeriod('');
      setShowPostJobModal(false);
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Failed to post job: ' + error.message);
      console.error('Error posting job:', error);
    }
  };

  const handleUpdateJob = async () => {
    if (!selectedJobForEdit) {
      Alert.alert('Error', 'No job selected for editing.');
      return;
    }

    const jobData = {
      skills: skills.split(',').map(s => s.trim()),
      experienceRequired: parseInt(experienceRequired) || 0,
      location,
      maxCTC: parseInt(maxCTC) || 0,
      noticePeriod,
      postedBy: user?._id,
      _id: selectedJobForEdit._id,
    };

    try {
      const response = await updateJob(jobData);
      Alert.alert('Success', 'Job updated successfully');
      console.log('Job updated successfully:', response);
      setJobTitle('');
      setExperienceRequired('');
      setLocation('');
      setMaxCTC('');
      setNoticePeriod('');
      setSelectedJobForEdit(null);
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update job: ' + error.message);
    }
  };

  const handleDeleteJob = async (jobId) => {
    try {
      console.log("job id", jobId);
      await deleteJob({ jobId });
      Alert.alert('Success', 'Job deleted successfully');
      setShowDeleteJobModal(false);
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete job: ' + error.message);
    }
  };

  const handleSearchSeekers = async () => {
    try {
      const response = await searchSeekers({ skills: seekerQuery, location: locationQuery });
      setSeekers(response.data);
      const scales = {};
      response.data.forEach(seeker => { scales[seeker._id] = new Animated.Value(1); });
      setConnectScales(scales);
    } catch (error) {
      Alert.alert('Error', 'Failed to search seekers: ' + error.message);
    }
  };

  const handleViewApplicants = async (jobId) => {
    try {
      const providerId = user?._id;
      const response = await getApplicants(providerId, jobId);
      setApplicants(response.data);
      setSelectedJobId(jobId);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch applicants: ' + error.message);
    }
  };

  const handleViewSeekerProfile = (seekerId) => {
    if (!seekerId) {
      Alert.alert('Error', 'No seeker selected');
      return;
    }
    setSelectedJobId(null);
    setSelectedSeekerId(seekerId);
    setShowSeekerProfileModal(true);
  };

  const handleEditJob = (job) => {
    setSelectedJobForEdit(job);
    setSkills((job.skills || []).join(', '));
    setExperienceRequired(job.experienceRequired?.toString() || '');
    setLocation(job.location || '');
    setMaxCTC(job.maxCTC?.toString() || '');
    setNoticePeriod(job.noticePeriod || '');
  };

  const handleCloseSeekerProfileModal = () => {
    setShowSeekerProfileModal(false);
    setSelectedSeekerId(null);
  };

  const handleWhatsAppConnect = (number, seekerName) => {
    const defaultMessage = `Hi ${seekerName}, I'm interested in discussing job opportunities with you`;
    Linking.openURL(  );
    Alert.alert('Success',` Connected with ${seekerName} via WhatsApp`);
  };

  const handleActiveInactiveJob = async (job) => {
    try {
      const jobId = job._id;
      const newAvailability = !job.available; // Toggle current availability
      const response = await changeJobAvailibility(jobId); // Updated API call
      console.log("Job availability response:", response.data);
      if (response.data.success) {
        setPostedJobs(prevJobs =>
          prevJobs.map(j => j._id === jobId ? { ...j, available: newAvailability } : j)
        );
        Alert.alert('Success', `Job marked as ${newAvailability ? 'Active' : 'Inactive'}`);
      } else {
        throw new Error(response.data.message || "Failed to toggle availability");
      }
    } catch (error) {
      console.log("Error while changing availability:", error);
      Alert.alert('Error', 'Failed to change job availability: ' + error.message);
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('ProviderProfile', { user });
  };

  const handleLogout = () => {
    navigation.navigate('Home');
  };

  const handlePressIn = (scale) => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  const handlePressOut = (scale) => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  const renderSeekerProfile = (seeker) => {
    if (!seeker) {
      return (
        <View>
          <Text style={[styles.itemText, isDarkMode ? styles.darkText : styles.lightText]}>
            No seeker data available.
          </Text>
        </View>
      );
    }

    return (
      <View>
        <Text style={[styles.itemText, isDarkMode ? styles.darkText : styles.lightText]}>Name: {seeker.fullName}</Text>
        <Text style={[styles.itemText, isDarkMode ? styles.darkText : styles.lightText]}>Email: {seeker.email || 'N/A'}</Text>
        <Text style={[styles.itemText, isDarkMode ? styles.darkText : styles.lightText]}>WhatsApp: {seeker.whatsappNumber || 'N/A'}</Text>
        <Text style={[styles.itemText, isDarkMode ? styles.darkText : styles.lightText]}>Job Names: {seeker.skills?.join(', ') || 'N/A'}</Text>
        <Text style={[styles.itemText, isDarkMode ? styles.darkText : styles.lightText]}>Experience: {seeker.experience || 0} years</Text>
        <Text style={[styles.itemText, isDarkMode ? styles.darkText : styles.lightText]}>Location: {seeker.location || 'N/A'}</Text>
        
        <TouchableOpacity
          style={[styles.actionButton, isDarkMode ? styles.darkButton : styles.lightButton]}
          onPress={() => handleWhatsAppConnect(seeker.whatsappNumber, seeker.fullName)}
          onPressIn={() => handlePressIn(connectScales[seeker._id])}
          onPressOut={() => handlePressOut(connectScales[seeker._id])}
        >
          <Animated.View style={{ transform: [{ scale: connectScales[seeker._id] || new Animated.Value(1) }] }}>
            <Text style={styles.buttonText}>WhatsApp</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  const getApplicantCount = (jobId) => {
    return applicants.filter(applicant => applicant.jobId === jobId).length;
  };

  const filteredJobs = () => {
    if (jobFilter === 'Active') return postedJobs.filter(job => job.available);
    if (jobFilter === 'Inactive') return postedJobs.filter(job => !job.available);
    return postedJobs;
  };

  return (
    <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      <Header title="Provider Dashboard" toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
      <View style={styles.topActions}>
        <TouchableOpacity style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]} onPress={handleEditProfile} onPressIn={() => handlePressIn(profileScale)} onPressOut={() => handlePressOut(profileScale)} activeOpacity={0.8}>
          <Animated.View style={{ transform: [{ scale: profileScale }] }}>
            <Text style={styles.buttonText}>Edit Profile</Text>
          </Animated.View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]} onPress={handleLogout} onPressIn={() => handlePressIn(logoutScale)} onPressOut={() => handlePressOut(logoutScale)} activeOpacity={0.8}>
          <Animated.View style={{ transform: [{ scale: logoutScale }] }}>
            <Text style={styles.buttonText}>Logout</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
         {user ? (
  <>
    {/* 👤 Provider Profile */}
    <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>
    Your Profile
  </Text>
<View style={[styles.profileCard, isDarkMode ? styles.darkCard : styles.lightCard]}>
  

  
  <Text style={[styles.profileLine, isDarkMode ? styles.darkText : styles.lightText]}>
    HR Name: <Text >{user.hrName}</Text>
  </Text>
  <Text style={[styles.profileLine, isDarkMode ? styles.darkText : styles.lightText]}>
    WhatsApp: <Text >{user.hrWhatsappNumber}</Text>
  </Text>
  <Text style={[styles.profileLine, isDarkMode ? styles.darkText : styles.lightText]}>
    Email: <Text >{user.email}</Text>
    
  </Text>
  <Text style={[styles.profileLine, isDarkMode ? styles.darkText : styles.lightText]}>
    Company Name: <Text >{user.companyName}</Text>
  </Text>
</View>


    {/* 📤 Post a New Job */}
    <TouchableOpacity
      style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
      onPress={() => setShowPostJobModal(true)}
      onPressIn={() => handlePressIn(postScale)}
      onPressOut={() => handlePressOut(postScale)}
      activeOpacity={0.8}
    >
      <Animated.View style={{ transform: [{ scale: postScale }] }}>
        <Text style={styles.buttonText}>Post a New Job</Text>
      </Animated.View>
    </TouchableOpacity>

    {/* 🔍 Search Job Seekers */}
    <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>Search Job Seekers</Text>
    <TextInput
      style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
      placeholder="Search By Job Name"
      value={seekerQuery}
      onChangeText={setSeekerQuery}
      placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
    />
    <TextInput
      style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
      placeholder="Search by Location"
      value={locationQuery}
      onChangeText={setLocationQuery}
      placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
    />
    <TouchableOpacity
      style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
      onPress={handleSearchSeekers}
      onPressIn={() => handlePressIn(searchScale)}
      onPressOut={() => handlePressOut(searchScale)}
      activeOpacity={0.8}
    >
      <Animated.View style={{ transform: [{ scale: searchScale }] }}>
        <Text style={styles.buttonText}>Search Seekers</Text>
      </Animated.View>
    </TouchableOpacity>

    {/* 📋 Seekers List */}
    <FlatList
      data={seekers}
      keyExtractor={(item) => item._id.toString()}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.listItem} onPress={() => handleViewSeekerProfile(item._id)}>
          <Text style={[styles.itemText, isDarkMode ? styles.darkText : styles.lightText]}>
            {item.fullName} - {item.skills?.join(', ') || 'N/A'} - {item.location || 'N/A'}
          </Text>
        </TouchableOpacity>
      )}
      scrollEnabled={false}
    />

    {/* 📌 Posted Jobs Filters */}
    <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>Your Posted Jobs</Text>

    {postedJobs.length > 0 ? (
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, jobFilter === 'All' && styles.activeFilter]}
          onPress={() => setJobFilter('All')}
        >
          <Text style={[styles.filterText, isDarkMode ? styles.darkText : styles.lightText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, jobFilter === 'Active' && styles.activeFilter]}
          onPress={() => setJobFilter('Active')}
        >
          <Text style={[styles.filterText, isDarkMode ? styles.darkText : styles.lightText]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, jobFilter === 'Inactive' && styles.activeFilter]}
          onPress={() => setJobFilter('Inactive')}
        >
          <Text style={[styles.filterText, isDarkMode ? styles.darkText : styles.lightText]}>Inactive</Text>
        </TouchableOpacity>
      </View>
    ) : 
                (<Text>No Job Posted By Your</Text>)
              }
              <FlatList
                data={filteredJobs()}
                keyExtractor={(item) => item._id.toString()}
                renderItem={({ item }) => {
                  return (
                    <View style={styles.jobItem}>
                      <View style={styles.jobNameContainer}>
                        <TouchableOpacity onPress={() => handleEditJob(item)}>

                         <Text style={[styles.jobTitle, isDarkMode ? styles.darkText : styles.lightText]}>
                            {item.skills?.map((skill, index) => (
                            <Text key={index}>
                              {skill}
                              {index !== item.skills.length - 1 ? " | " : ""}
                            </Text>
                           ))}
                        </Text>

                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleActiveInactiveJob(item)}
                          style={[styles.jobActiveBtn, item.available ? styles.jobActive : styles.jobInactive]}
                        >
                          <Text style={styles.jobActiveText}>
                            {item.available ? 'Active' : 'Inactive'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.jobActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, isDarkMode ? styles.darkButton : styles.lightButton]}
                          onPress={() => handleViewApplicants(item._id)}
                        >
                          <Text style={styles.buttonText}>View Applicants ({getApplicantCount(item._id)})</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, isDarkMode ? styles.darkButton : styles.lightButton]}
                          onPress={() => handleEditJob(item)}
                          onPressIn={() => handlePressIn(editJobScale)}
                          onPressOut={() => handlePressOut(editJobScale)}
                        >
                          <Animated.View style={{ transform: [{ scale: editJobScale }] }}>
                            <Text style={styles.buttonText}>Edit Job</Text>
                          </Animated.View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, isDarkMode ? styles.darkButton : styles.lightButton]}
                          onPress={()=>handleDeleteJob(item._id)}
                          onPressIn={() => handlePressIn(deleteJobScale)}
                          onPressOut={() => handlePressOut(deleteJobScale)}
                        >
                          <Animated.View style={{ transform: [{ scale: deleteJobScale }] }}>
                            <Text style={styles.buttonText}>Delete Job</Text>
                          </Animated.View>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
                scrollEnabled={false}
              />

              {/* Post Job Modal */}
              <Modal
                  visible={showPostJobModal}
                  transparent={true}
                  animationType="slide"
                  onRequestClose={() => setShowPostJobModal(false)}
                >
                  <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDarkMode ? styles.darkModal : styles.lightModal]}>
                      <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>Post a New Job</Text>
                      
                      <Text style={[ !isDarkMode ? styles.label : styles.lightLabel]}>Job Names (comma-separated)</Text>
                      <TextInput
                      style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
                      placeholder="Skills (comma-separated)"
                      value={skills}
                      onChangeText={setSkills}
                      placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
                    />
                      
                      <Text  style={[ !isDarkMode ? styles.label : styles.lightLabel]}>Experience Required (Months)</Text>
                      <TextInput
                        style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
                        placeholder="Experience Required (Months)"
                        value={experienceRequired}
                        onChangeText={setExperienceRequired}
                        keyboardType="numeric"
                        placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
                      />
                      
                      <Text  style={[ !isDarkMode ? styles.label : styles.lightLabel]}>Location</Text>
                      <TextInput
                        style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
                        placeholder="Location"
                        value={location}
                        onChangeText={setLocation}
                        placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
                      />
                      
                      <Text  style={[ !isDarkMode ? styles.label : styles.lightLabel]}>Salary/Month</Text>
                      <TextInput
                        style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
                        placeholder="EnterSalary Per Month"
                        value={maxCTC}
                        onChangeText={setMaxCTC}
                        keyboardType="numeric"
                        placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
                      />
                      
                      <Text  style={[ !isDarkMode ? styles.label : styles.lightLabel]}>Join Within Days</Text>
                      <TextInput
                        style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
                        placeholder="Join Withing Days"
                        value={noticePeriod}
                        onChangeText={setNoticePeriod}
                        placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
                      />
                      
                      <TouchableOpacity
                        style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
                        onPress={handlePostJob}
                        onPressIn={() => handlePressIn(postScale)}
                        onPressOut={() => handlePressOut(postScale)}
                        activeOpacity={0.8}
                      >
                        <Animated.View style={{ transform: [{ scale: postScale }] }}>
                          <Text style={styles.buttonText}>Post Job</Text>
                        </Animated.View>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
                        onPress={() => setShowPostJobModal(false)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.buttonText}>Close</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
              </Modal>

              {/* Seeker Profile Modal */}
              <Modal visible={showSeekerProfileModal} transparent={true} animationType="slide" onRequestClose={() => setShowSeekerProfileModal(false)}>
                <View style={[styles.modalOverlay, { zIndex: 10 }]}>
                  <View style={[styles.modalContent, isDarkMode ? styles.darkModal : styles.lightModal]}>
                    <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>Seeker Profile</Text>
                    {renderSeekerProfile(
                      seekers.find(s => s._id === selectedSeekerId) ||
                      applicants.find(a => a.seeker?._id === selectedSeekerId)?.seeker ||
                      null
                    )}
                    <TouchableOpacity style={[styles.closeButton, isDarkMode ? styles.darkButton : styles.lightButton]} onPress={handleCloseSeekerProfileModal} activeOpacity={0.8}>
                      <Text style={styles.buttonText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>

              {/* Applicants Modal */}
              <Modal visible={!!selectedJobId} transparent={true} animationType="slide" onRequestClose={() => setSelectedJobId(null)}>
                <View style={styles.modalOverlay}>
                  <View style={[styles.modalContent, isDarkMode ? styles.darkModal : styles.lightModal]}>
                    <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>Applicants for {postedJobs.find(j => j._id === selectedJobId)?.jobTitle}</Text>
                    <FlatList
                      data={applicants.filter(applicant => applicant.jobId === selectedJobId)}
                      keyExtractor={(item) => item._id.toString()}
                      renderItem={({ item }) => {
                        if (!item.seeker) {
                          return (
                            <View style={styles.listItem}>
                              <Text style={[styles.itemText, isDarkMode ? styles.darkText : styles.lightText]}>
                                No seeker data available for this applicant.
                              </Text>
                            </View>
                          );
                        }
                        return (
                          <View style={styles.listItem}>
                            <Text style={[styles.itemText, isDarkMode ? styles.darkText : styles.lightText]}>
                              {item.seeker.fullName} - {item.seeker.email || 'N/A'}
                            </Text>
                            <TouchableOpacity
                              style={[styles.actionButton, isDarkMode ? styles.darkButton : styles.lightButton]}
                              onPress={() => handleViewSeekerProfile(item.seeker._id)}
                            >
                              <Text style={styles.buttonText}>View More</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      }}
                    />
                    <TouchableOpacity style={[styles.closeButton, isDarkMode ? styles.darkButton : styles.lightButton]} onPress={() => setSelectedJobId(null)} activeOpacity={0.8}>
                      <Text style={styles.buttonText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>

              {/* Job Details Modal */}
              <Modal
                visible={!!selectedJobForEdit}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setSelectedJobForEdit(null)}
              >
                <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, isDarkMode ? styles.darkModal : styles.lightModal]}>
                  <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>Edit Job</Text>
                  
                  <Text  style={[ !isDarkMode ? styles.label : styles.lightLabel]}>Job Names (comma-separated)</Text>
                  <TextInput
                      style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
                      placeholder="Skills (comma-separated)"
                      value={skills}
                      onChangeText={setSkills}
                      placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
                    />
                  
                  <Text style={[ !isDarkMode ? styles.label : styles.lightLabel]}>Experience Required (Months)</Text>
                  <TextInput
                    style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
                    placeholder="Experience Required (Months)"
                    value={experienceRequired || ''}
                    onChangeText={setExperienceRequired}
                    keyboardType="numeric"
                    placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
                  />
                  
                  <Text  style={[ !isDarkMode ? styles.label : styles.lightLabel]}>Location</Text>
                  <TextInput
                    style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
                    placeholder="Location"
                    value={location || ''}
                    onChangeText={setLocation}
                    placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
                  />
                  
                  <Text  style={[ !isDarkMode ? styles.label : styles.lightLabel]}>Salary</Text>
                  <TextInput
                    style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
                    placeholder="Salary"
                    value={maxCTC || ''}
                    onChangeText={setMaxCTC}
                    keyboardType="numeric"
                    placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
                  />
                  
                  <Text  style={[ !isDarkMode ? styles.label : styles.lightLabel]}>Join Within Days</Text>
                  <TextInput
                    style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
                    placeholder="Join Within Days"
                    value={noticePeriod || ''}
                    onChangeText={setNoticePeriod}
                    placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
                  />
                  
                  <TouchableOpacity
                    style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
                    onPress={handleUpdateJob}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.buttonText}>Save Changes</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
                    onPress={() => setSelectedJobForEdit(null)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.buttonText}>Close</Text>
                  </TouchableOpacity>
                </View>
                </View>
              </Modal>
            </>
          ) : (
            <Text style={[styles.loading, isDarkMode ? styles.darkText : styles.lightText]}>Loading profile...</Text>
          )}
        </View>
      </ScrollView>
      <Footer isDarkMode={isDarkMode} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightContainer: { backgroundColor: '#fff' },
  darkContainer: { backgroundColor: '#111' },
  scrollContent: { paddingBottom: 60, flexGrow: 1 },
  content: { padding: 10, flexGrow: 1 },
  topActions: { flexDirection: 'row', justifyContent: 'space-between', padding: 10 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
  lightInput: { borderColor: '#ccc', color: '#000' },
  darkInput: { borderColor: '#555', color: '#ddd', backgroundColor: '#333' },
  listItem: { padding: 10, borderBottomWidth: 1, borderColor: '#ccc' },
  itemText: { fontSize: 16, marginBottom: 5 },
  jobItem: { padding: 10, borderBottomWidth: 1, borderColor: '#ccc' },
  jobText: { fontSize: 16 },
  jobActions: { flexDirection: 'row', gap: 10, marginTop: 5 },
  actionButton: { padding: 5, borderRadius: 5 },
  button: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, alignItems: 'center', marginBottom: 10 },
  lightButton: { backgroundColor: '#007AFF' },
  darkButton: { backgroundColor: '#005BB5' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10 },
  modalContent: { width: '90%', padding: 20, borderRadius: 10 },
  lightModal: { backgroundColor: '#fff' },
  darkModal: { backgroundColor: '#333' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  closeButton: { marginTop: 10, padding: 10, borderRadius: 5, alignItems: 'center' },
  loading: { fontSize: 16, textAlign: 'center' },
  lightText: { color: '#000' },
  darkText: { color: '#ddd' },
  jobActiveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  lightLabel:{
    fontSize: 16,
    fontWeight: 'white',
    color: '#fff',
    marginBottom: 5,
  },
  jobActive: { backgroundColor: 'green' },
  jobInactive: { backgroundColor: 'red' },
  jobActiveText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  jobNameContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 10 },
  filterContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  filterButton: { padding: 8, borderRadius: 5, borderWidth: 1, borderColor: '#ccc' },
  activeFilter: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  filterText: { fontSize: 14, fontWeight: 'bold' },

  profileCard: {
    padding: 10, borderRadius: 5, marginBottom: 20
  },
  profileLine:{
     fontSize: 16, marginBottom: 5
  },
  darkCard: {
    backgroundColor: '#1e1e1e',
  },
  lightCard: {
    backgroundColor: '#f0f0f0',
  },
 
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  value: {
    fontSize: 15,
    marginBottom: 4,
  },
 
 
});